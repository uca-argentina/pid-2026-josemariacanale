import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  Booking,
  BookingStatus,
  ClientBooking,
  DAILY_LIMIT_REACHED,
  PanelBooking,
  UpcomingBooking,
  UserBooking,
} from '../../domain/bookings/booking';
import {
  BookingsRepository,
  CabinOccupancy,
  CreateBookingData,
  DailyLimitGuard,
  RescheduleTimes,
} from '../../domain/bookings/bookings.repository';
import {
  BusinessRuleError,
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { DEFAULT_AVAILABILITY } from '../../domain/availabilities/availability';
import { Prisma } from '../../generated/prisma/client';
import {
  BOOKING_CABIN_NO_OVERLAP,
  BOOKING_NO_OVERLAP,
  isExclusionViolation,
} from '../prisma-errors';
import { PrismaService } from '../prisma.service';

/** Statuses that hold a Usuario's horario, as the Booking_no_overlap constraint does. */
const OCCUPYING = [BookingStatus.PENDING, BookingStatus.BOOKED];

/**
 * First key of the advisory locks that serialize verifications per Servicio: an arbitrary namespace (the issue that
 * introduced them) so a lock taken for anything else never collides with these.
 */
const DAILY_LIMIT_LOCK = 61;

/** The fields of a Turno that `toBooking` reads, with its Cliente, which lives in its own table (ADR 0022). */
const BOOKING_SELECT = {
  id: true,
  serviceId: true,
  employeeId: true,
  userId: true,
  cabinId: true,
  prepStartsAt: true,
  startsAt: true,
  endsAt: true,
  status: true,
  notes: true,
  noShowAt: true,
  link: true,
  fromRescheduleId: true,
  employeeChosen: true,
  depositAmount: true,
  depositPaidAt: true,
  price: true,
  cancelledAt: true,
  rejectedAt: true,
  client: { select: { name: true, email: true } },
} satisfies Prisma.BookingSelect;

type BookingRow = Prisma.BookingGetPayload<{ select: typeof BOOKING_SELECT }>;

/** `BOOKING_SELECT` plus the Cabina the panel shows, even once dada de baja. */
const PANEL_BOOKING_SELECT = {
  ...BOOKING_SELECT,
  cabin: { select: { id: true, name: true } },
} satisfies Prisma.BookingSelect;

type PanelBookingRow = Prisma.BookingGetPayload<{
  select: typeof PANEL_BOOKING_SELECT;
}>;

/** `BOOKING_SELECT` plus the Servicio, Negocio and Sucursal data the Enlace del Turno shows (ADR 0022). */
const CLIENT_BOOKING_SELECT = {
  ...BOOKING_SELECT,
  user: {
    select: {
      name: true,
      slug: true,
      availabilities: {
        where: { isDefault: true },
        select: { timeZone: true },
        take: 1,
      },
    },
  },
  employee: { select: { user: { select: { name: true } } } },
  service: {
    select: {
      name: true,
      durationMinutes: true,
      price: true,
      depositPercent: true,
      availability: { select: { timeZone: true } },
      branch: {
        select: {
          name: true,
          slug: true,
          address: true,
          timeZone: true,
          business: { select: { name: true, slug: true } },
          images: { select: { url: true }, orderBy: { order: 'asc' }, take: 1 },
        },
      },
    },
  },
} satisfies Prisma.BookingSelect;

type ClientBookingRow = Prisma.BookingGetPayload<{
  select: typeof CLIENT_BOOKING_SELECT;
}>;

/** Emails are stored and searched trimmed and lowercased, whatever the caller sent. */
const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class PrismaBookingsRepository implements BookingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea el Turno. Con `dailyLimit`, un advisory lock por Servicio hace que contar y crear sea un solo paso: una
   * segunda creación casi junta del mismo Servicio espera a que la primera confirme, y después cuenta.
   *
   * @throws {ConflictError} el horario ya lo ocupa otro Turno pendiente o aceptado del Empleado, o el Servicio ya alcanzó su Límite diario ese día
   */
  async create(data: CreateBookingData, dailyLimit?: DailyLimitGuard) {
    const { clientName, clientEmail, ...booking } = data;
    const insert = (client: Prisma.TransactionClient | PrismaService) =>
      client.booking.create({
        select: BOOKING_SELECT,
        data: {
          ...booking,
          link: generateBookingLink(),
          client: {
            create: { name: clientName, email: normalizeEmail(clientEmail) },
          },
        },
      });
    if (!dailyLimit) return toBooking(await insert(this.prisma).catch(translateError));
    const { serviceId, limit, from, to } = dailyLimit;
    return toBooking(
      await this.prisma
        .$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(${DAILY_LIMIT_LOCK}::int, ${serviceId}::int)`;
          const taken = await tx.booking.count({
            where: {
              serviceId,
              status: { in: OCCUPYING },
              startsAt: { gte: from, lt: to },
            },
          });
          if (taken >= limit) throw new ConflictError(DAILY_LIMIT_REACHED);
          return insert(tx);
        })
        .catch((error: unknown) =>
          error instanceof ConflictError
            ? Promise.reject(error)
            : translateError(error),
        ),
    );
  }

  /**
   * @throws {DatabaseOperationError} falló la base
   */
  async lastReceivedByEmployee(
    serviceId: number,
    employeeIds: number[],
    excludeBookingId?: number,
  ) {
    const rows = await this.prisma.booking
      .groupBy({
        by: ['employeeId'],
        where: {
          ...notExcluded(excludeBookingId),
          serviceId,
          employeeId: { in: employeeIds },
          status: { in: OCCUPYING },
        },
        _max: { createdAt: true },
      })
      .catch(translateError);
    return new Map(
      rows.flatMap(({ employeeId, _max }) =>
        employeeId !== null && _max.createdAt
          ? [[employeeId, _max.createdAt] as const]
          : [],
      ),
    );
  }

  /**
   * Cuándo recibió cada Cabina su último Turno pendiente o aceptado, de cualquier Servicio.
   *
   * @throws {DatabaseOperationError} falló la base
   */
  async lastReceivedByCabin(cabinIds: number[], excludeBookingId?: number) {
    const rows = await this.prisma.booking
      .groupBy({
        by: ['cabinId'],
        where: {
          ...notExcluded(excludeBookingId),
          cabinId: { in: cabinIds },
          status: { in: OCCUPYING },
        },
        _max: { createdAt: true },
      })
      .catch(translateError);
    return new Map(
      rows.flatMap(({ cabinId, _max }) =>
        cabinId !== null && _max.createdAt
          ? [[cabinId, _max.createdAt] as const]
          : [],
      ),
    );
  }

  /**
   * Los tramos que los Turnos pendientes o aceptados ocupan de estas Cabinas, por inicio.
   *
   * @throws {DatabaseOperationError} falló la base
   */
  async listOccupiedByCabins(
    cabinIds: number[],
    from: Date,
    to: Date,
    excludeBookingId?: number,
  ): Promise<CabinOccupancy[]> {
    const rows = await this.prisma.booking
      .findMany({
        where: {
          ...notExcluded(excludeBookingId),
          cabinId: { in: cabinIds },
          status: { in: OCCUPYING },
          prepStartsAt: { lt: to },
          endsAt: { gt: from },
        },
        select: { cabinId: true, prepStartsAt: true, endsAt: true },
        orderBy: { prepStartsAt: 'asc' },
      })
      .catch(translateError);
    // The where clause leaves out the Turnos without Cabina.
    return rows.map(({ cabinId, prepStartsAt, endsAt }) => ({
      cabinId: cabinId!,
      prepStartsAt,
      endsAt,
    }));
  }

  /**
   * Cuenta los Turnos pendientes o aceptados de la Cabina que terminan después de `now`.
   *
   * @throws {DatabaseOperationError} falló la base
   */
  async countUpcomingByCabin(cabinId: number, now: Date) {
    return this.prisma.booking
      .count({
        where: { cabinId, status: { in: OCCUPYING }, endsAt: { gt: now } },
      })
      .catch(translateError);
  }

  /**
   * Lists when the Servicio's PENDING and BOOKED Turnos start, to count them against its Límite diario.
   *
   * @throws {DatabaseOperationError} falló la base
   */
  async listOccupiedStartsByService(
    serviceId: number,
    from: Date,
    to: Date,
    excludeBookingId?: number,
  ) {
    const rows = await this.prisma.booking
      .findMany({
        where: {
          ...notExcluded(excludeBookingId),
          serviceId,
          status: { in: OCCUPYING },
          startsAt: { gte: from, lt: to },
        },
        select: { startsAt: true },
      })
      .catch(translateError);
    return rows.map(({ startsAt }) => startsAt);
  }

  /**
   * @throws {DatabaseOperationError} falló la base
   */
  async listByBusiness(businessId: number) {
    return (
      await this.prisma.booking
        .findMany({
          where: { employee: { businessId }, rescheduled: null },
          select: PANEL_BOOKING_SELECT,
        })
        .catch(translateError)
    ).map(toPanelBooking);
  }

  /**
   * @throws {NotFoundError} el Turno no existe
   */
  async findById(id: number) {
    const row = await this.prisma.booking
      .findUnique({ where: { id }, select: BOOKING_SELECT })
      .catch(translateError);
    if (!row) throw new NotFoundError('Booking not found');
    return toBooking(row);
  }

  /**
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   */
  async findByLink(link: string): Promise<ClientBooking> {
    const row = await this.prisma.booking
      .findUnique({ where: { link }, select: CLIENT_BOOKING_SELECT })
      .catch(translateError);
    if (!row) throw new NotFoundError('Turno not found');
    return toClientBooking(row);
  }

  /**
   * @throws {NotFoundError} el Turno no existe
   */
  private async findEnriched(id: number): Promise<ClientBooking> {
    const row = await this.prisma.booking
      .findUnique({ where: { id }, select: CLIENT_BOOKING_SELECT })
      .catch(translateError);
    if (!row) throw new NotFoundError('Booking not found');
    return toClientBooking(row);
  }

  /**
   * @throws {BusinessRuleError} el Turno ya no está pendiente
   * @throws {NotFoundError} el Turno no existe
   */
  async resolvePending(
    id: number,
    status: BookingStatus.BOOKED | BookingStatus.REJECTED,
    now: Date,
  ) {
    const { count } = await this.prisma.booking
      .updateMany({
        where: { id, status: BookingStatus.PENDING },
        data: {
          status,
          ...(status === BookingStatus.REJECTED && { rejectedAt: now }),
        },
      })
      .catch(translateError);
    if (count === 0) throw new BusinessRuleError('Turno is not pending');
    return this.findById(id);
  }

  async listOccupiedByUser(
    userId: number,
    from: Date,
    to: Date,
    excludeBookingId?: number,
  ) {
    return this.prisma.booking
      .findMany({
        where: {
          ...notExcluded(excludeBookingId),
          userId,
          status: { in: OCCUPYING },
          prepStartsAt: { lt: to },
          endsAt: { gt: from },
        },
        select: { prepStartsAt: true, endsAt: true },
      })
      .catch(translateError);
  }

  /**
   * @throws {DatabaseOperationError} falló la base
   */
  async listUpcomingByUser(
    userId: number,
    from: Date,
  ): Promise<UpcomingBooking[]> {
    const rows = await this.prisma.booking
      .findMany({
        where: { userId, status: { in: OCCUPYING }, startsAt: { gte: from } },
        select: {
          id: true,
          startsAt: true,
          employeeId: true,
          client: { select: { name: true } },
          service: {
            select: {
              availability: { select: { timeZone: true } },
              // Only the Usuario's own Empleado rows; this Turno's is picked by `employeeId` below.
              employees: {
                where: { employee: { userId } },
                select: {
                  employeeId: true,
                  availability: { select: { timeZone: true } },
                },
              },
            },
          },
        },
        orderBy: { startsAt: 'asc' },
      })
      .catch(translateError);
    return rows.map((row) => ({
      id: row.id,
      startsAt: row.startsAt,
      clientName: row.client!.name,
      timeZone: (
        row.service.availability ??
        row.service.employees.find((e) => e.employeeId === row.employeeId)!
          .availability
      ).timeZone,
    }));
  }

  /**
   * @throws {DatabaseOperationError} falló la base
   */
  async listByUser(userId: number): Promise<UserBooking[]> {
    const rows = await this.prisma.booking
      .findMany({
        where: {
          userId,
          rescheduled: null,
          // A Negocio that dio de baja the Usuario no longer shows its Turnos to them.
          OR: [{ employeeId: null }, { employee: { deletedAt: null } }],
        },
        select: {
          ...PANEL_BOOKING_SELECT,
          service: {
            select: {
              name: true,
              branch: {
                select: {
                  id: true,
                  name: true,
                  business: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { startsAt: 'asc' },
      })
      .catch(translateError);
    return rows.map((row) => {
      const branch = row.service.branch;
      return {
        ...toPanelBooking(row),
        serviceName: row.service.name,
        business: branch && branch.business,
        branch: branch && { id: branch.id, name: branch.name },
      };
    });
  }

  /**
   * @throws {BusinessRuleError} el Turno ya no está aceptado
   * @throws {NotFoundError} el Turno no existe
   */
  async cancel(id: number, now: Date) {
    await this.updateStatus(
      id,
      [BookingStatus.BOOKED],
      { status: BookingStatus.CANCELLED, cancelledAt: now },
      'Turno is not booked',
    );
    return this.findById(id);
  }

  /**
   * @throws {BusinessRuleError} el Turno ya no está pendiente ni aceptado
   * @throws {NotFoundError} el Turno no existe
   */
  async cancelPendingOrBooked(id: number, now: Date) {
    await this.updateStatus(
      id,
      OCCUPYING,
      { status: BookingStatus.CANCELLED, cancelledAt: now },
      'Turno is not pending or booked',
    );
    return this.findEnriched(id);
  }

  /**
   * Reagenda reemplazando el Turno (ADR 0031): el original queda cancelado y el nuevo, en el horario nuevo, lleva su Enlace.
   *
   * @throws {BusinessRuleError} el Turno ya no está aceptado
   * @throws {ConflictError} el nuevo horario pisa otro Turno pendiente o aceptado del Empleado
   * @throws {NotFoundError} el Turno no existe
   */
  async reschedule(
    id: number,
    times: RescheduleTimes,
    now: Date,
  ): Promise<PanelBooking> {
    const newId = await this.replace(
      id,
      [BookingStatus.BOOKED],
      { ...times, status: BookingStatus.BOOKED },
      now,
      'Turno is not booked',
    );
    const row = await this.prisma.booking
      .findUnique({ where: { id: newId }, select: PANEL_BOOKING_SELECT })
      .catch(translateError);
    return toPanelBooking(row!);
  }

  /**
   * @throws {BusinessRuleError} el Turno ya no está pendiente ni aceptado
   * @throws {ConflictError} el nuevo horario pisa otro Turno pendiente o aceptado del Empleado
   * @throws {NotFoundError} el Turno no existe
   */
  async reschedulePendingOrBooked(
    id: number,
    times: RescheduleTimes & Pick<Booking, 'status'>,
    now: Date,
  ) {
    return this.findEnriched(
      await this.replace(id, OCCUPYING, times, now, 'Turno is not pending or booked'),
    );
  }

  /**
   * @throws {BusinessRuleError} el Turno no está aceptado, su horario no terminó o ya tiene Ausencia
   * @throws {NotFoundError} el Turno no existe
   */
  async markNoShow(id: number, now: Date) {
    await this.updateStatus(
      id,
      [BookingStatus.BOOKED],
      { noShowAt: now },
      'Turno is not booked, has not ended yet, or already has an Ausencia',
      { endsAt: { lte: now }, noShowAt: null },
    );
    return this.findById(id);
  }

  /**
   * Marca la Seña del Turno como pagada, solo si la guarda sigue valiendo en el momento de escribir.
   *
   * @throws {BusinessRuleError} el Turno ya no está pendiente ni aceptado, ya empezó, no tiene Seña o ya la tiene pagada
   * @throws {NotFoundError} el Turno no existe
   */
  async payDeposit(id: number, now: Date) {
    await this.updateStatus(
      id,
      OCCUPYING,
      { depositPaidAt: now },
      'Turno is not pending or booked, has already started, has no Seña, or already has its Seña paid',
      { startsAt: { gt: now }, depositAmount: { not: null }, depositPaidAt: null },
    );
    return this.findEnriched(id);
  }

  /**
   * Cancels the Turno as rescheduled and creates its replacement in one transaction, so a failed creation leaves the
   * original untouched. The new Turno takes over the Enlace del Turno (unique, so the original lets go of it first)
   * and copies what the Cliente gave and paid. Returns the new id.
   */
  private async replace(
    id: number,
    fromStatuses: BookingStatus[],
    times: RescheduleTimes & Pick<Booking, 'status'>,
    now: Date,
    message: string,
  ): Promise<number> {
    return this.prisma
      .$transaction(async (tx) => {
        const original = await tx.booking.findUnique({
          where: { id },
          select: {
            serviceId: true,
            link: true,
            notes: true,
            employeeChosen: true,
            price: true,
            depositAmount: true,
            depositPaidAt: true,
            // Kept so the rotation of Empleados and Cabinas ("el que hace más tiempo que no recibe un Turno") ignores a Reagendar.
            createdAt: true,
            client: { select: { name: true, email: true } },
          },
        });
        if (!original) throw new NotFoundError(`Booking ${id} not found`);
        const { count } = await tx.booking.updateMany({
          where: { id, status: { in: fromStatuses } },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: now,
            rescheduled: true,
            link: null,
          },
        });
        if (count === 0) throw new BusinessRuleError(message);
        const { client, ...copied } = original;
        const created = await tx.booking.create({
          select: { id: true },
          data: {
            ...copied,
            ...times,
            fromRescheduleId: id,
            client: { create: { name: client!.name, email: client!.email } },
          },
        });
        return created.id;
      })
      .catch((error: unknown) =>
        error instanceof BusinessRuleError || error instanceof NotFoundError
          ? Promise.reject(error)
          : translateError(error),
      );
  }

  /** Applies `data` only while the Turno is still one of `fromStatuses` (and matches `extraWhere`), so a race can't resurrect it. */
  private async updateStatus(
    id: number,
    fromStatuses: BookingStatus[],
    data: Prisma.BookingUncheckedUpdateManyInput,
    message: string,
    extraWhere: Prisma.BookingWhereInput = {},
  ) {
    const { count } = await this.prisma.booking
      .updateMany({
        where: { id, status: { in: fromStatuses }, ...extraWhere },
        data,
      })
      .catch(translateError);
    if (count === 0) throw new BusinessRuleError(message);
  }
}

const notExcluded = (excludeBookingId?: number) =>
  excludeBookingId === undefined ? {} : { id: { not: excludeBookingId } };

/** Every Turno is created with its Cliente, so `client` is never null. */
const toBooking = (row: BookingRow): Booking => ({
  id: row.id,
  serviceId: row.serviceId,
  employeeId: row.employeeId,
  userId: row.userId,
  cabinId: row.cabinId,
  clientName: row.client!.name,
  clientEmail: row.client!.email,
  prepStartsAt: row.prepStartsAt,
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  status: row.status as BookingStatus,
  notes: row.notes,
  noShowAt: row.noShowAt,
  link: row.link,
  fromRescheduleId: row.fromRescheduleId,
  employeeChosen: row.employeeChosen,
  depositAmount: row.depositAmount === null ? null : Number(row.depositAmount),
  depositPaidAt: row.depositPaidAt,
  price: Number(row.price),
  cancelledAt: row.cancelledAt,
  rejectedAt: row.rejectedAt,
});

/** The Turno with its Cabina, for the panel. */
const toPanelBooking = (row: PanelBookingRow): PanelBooking => ({
  ...toBooking(row),
  cabin: row.cabin,
});

/** 256 bits, URL-safe (ADR 0022 pide al menos 128). */
const generateBookingLink = (): string => randomBytes(32).toString('base64url');

/** The Sucursal's data if the Servicio is del Negocio, with its cover (the first Imagen de Sucursal by order). */
const toClientBooking = (row: ClientBookingRow): ClientBooking => {
  const branch = row.service.branch;
  return {
    ...toBooking(row),
    // A personal Service dado de baja has lost its Availability: its Turnos fall back to the Usuario's default one.
    timeZone: branch
      ? branch.timeZone
      : (row.service.availability ?? row.user.availabilities[0])?.timeZone ??
        DEFAULT_AVAILABILITY.timeZone,
    employeeName: row.employee ? row.employee.user.name : row.user.name,
    service: {
      name: row.service.name,
      durationMinutes: row.service.durationMinutes,
      price: Number(row.service.price),
      depositPercent: row.service.depositPercent,
    },
    business: branch
      ? { name: branch.business.name, slug: branch.business.slug }
      : null,
    branch: branch
      ? {
          name: branch.name,
          slug: branch.slug,
          address: branch.address,
          coverUrl: branch.images[0]?.url ?? null,
        }
      : null,
    user: branch ? null : { slug: row.user.slug },
  };
};

const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025')
      throw new NotFoundError('Booking not found', { cause: error });
    if (
      isExclusionViolation(error, BOOKING_NO_OVERLAP) ||
      isExclusionViolation(error, BOOKING_CABIN_NO_OVERLAP)
    )
      throw new ConflictError('Overlaps a booked Turno for this Employee', {
        cause: error,
      });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
