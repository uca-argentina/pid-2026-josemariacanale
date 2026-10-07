import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  Booking,
  BookingStatus,
  ClientBooking,
  DAILY_LIMIT_REACHED,
  EmployeeBooking,
} from '../../domain/bookings/booking';
import {
  BookingsRepository,
  CreateBookingData,
  DailyLimitGuard,
} from '../../domain/bookings/bookings.repository';
import {
  BusinessRuleError,
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { Prisma } from '../../generated/prisma/client';
import { BOOKING_NO_OVERLAP, isExclusionViolation } from '../prisma-errors';
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
  prepStartsAt: true,
  startsAt: true,
  endsAt: true,
  status: true,
  notes: true,
  noShowAt: true,
  link: true,
  client: { select: { name: true, email: true } },
} satisfies Prisma.BookingSelect;

type BookingRow = Prisma.BookingGetPayload<{ select: typeof BOOKING_SELECT }>;

/** `BOOKING_SELECT` plus the Servicio, Negocio and Sucursal data Mis turnos del Cliente shows (ADR 0022). */
const CLIENT_BOOKING_SELECT = {
  ...BOOKING_SELECT,
  user: { select: { name: true } },
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
  async findByClientEmail(email: string) {
    return (
      await this.prisma.booking
        .findMany({
          where: { client: { email: normalizeEmail(email) } },
          select: CLIENT_BOOKING_SELECT,
          orderBy: { startsAt: 'asc' },
        })
        .catch(translateError)
    ).map(toClientBooking);
  }

  async listByBusiness(businessId: number) {
    return (
      await this.prisma.booking
        .findMany({
          where: { employee: { businessId } },
          select: BOOKING_SELECT,
        })
        .catch(translateError)
    ).map(toBooking);
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
  ) {
    const { count } = await this.prisma.booking
      .updateMany({
        where: { id, status: BookingStatus.PENDING },
        data: { status },
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
  async listByEmployees(employeeIds: number[]): Promise<EmployeeBooking[]> {
    const rows = await this.prisma.booking
      .findMany({
        where: { employeeId: { in: employeeIds } },
        select: {
          ...BOOKING_SELECT,
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
      // A Turno with an Empleado is of a Servicio del Negocio, so it has a Sucursal.
      const branch = row.service.branch!;
      return {
        ...toBooking(row),
        serviceName: row.service.name,
        businessId: branch.business.id,
        businessName: branch.business.name,
        branchId: branch.id,
        branchName: branch.name,
      };
    });
  }

  /**
   * @throws {BusinessRuleError} el Turno ya no está aceptado
   * @throws {NotFoundError} el Turno no existe
   */
  async cancel(id: number) {
    await this.updateStatus(
      id,
      [BookingStatus.BOOKED],
      { status: BookingStatus.CANCELLED },
      'Turno is not booked',
    );
    return this.findById(id);
  }

  /**
   * @throws {BusinessRuleError} el Turno ya no está pendiente ni aceptado
   * @throws {NotFoundError} el Turno no existe
   */
  async cancelPendingOrBooked(id: number) {
    await this.updateStatus(
      id,
      OCCUPYING,
      { status: BookingStatus.CANCELLED },
      'Turno is not pending or booked',
    );
    return this.findEnriched(id);
  }

  /**
   * @throws {BusinessRuleError} el Turno ya no está aceptado
   * @throws {ConflictError} el nuevo horario pisa otro Turno pendiente o aceptado del Empleado
   * @throws {NotFoundError} el Turno no existe
   */
  async reschedule(
    id: number,
    { employeeId, userId, prepStartsAt, startsAt, endsAt }: Pick<Booking, 'employeeId' | 'userId' | 'prepStartsAt' | 'startsAt' | 'endsAt'>,
  ) {
    await this.updateStatus(
      id,
      [BookingStatus.BOOKED],
      { employeeId, userId, prepStartsAt, startsAt, endsAt },
      'Turno is not booked',
    );
    return this.findById(id);
  }

  /**
   * @throws {BusinessRuleError} el Turno ya no está pendiente ni aceptado
   * @throws {ConflictError} el nuevo horario pisa otro Turno pendiente o aceptado del Empleado
   * @throws {NotFoundError} el Turno no existe
   */
  async reschedulePendingOrBooked(
    id: number,
    { employeeId, userId, prepStartsAt, startsAt, endsAt, status }: Pick<
      Booking,
      'employeeId' | 'userId' | 'prepStartsAt' | 'startsAt' | 'endsAt' | 'status'
    >,
  ) {
    await this.updateStatus(
      id,
      OCCUPYING,
      { employeeId, userId, prepStartsAt, startsAt, endsAt, status },
      'Turno is not pending or booked',
    );
    return this.findEnriched(id);
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
  clientName: row.client!.name,
  clientEmail: row.client!.email,
  prepStartsAt: row.prepStartsAt,
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  status: row.status as BookingStatus,
  notes: row.notes,
  noShowAt: row.noShowAt,
  link: row.link,
});

/** 256 bits, URL-safe (ADR 0022 pide al menos 128). */
const generateBookingLink = (): string => randomBytes(32).toString('base64url');

/** The Sucursal's data if the Servicio is del Negocio, with its cover (the first Imagen de Sucursal by order). */
const toClientBooking = (row: ClientBookingRow): ClientBooking => {
  const branch = row.service.branch;
  return {
    ...toBooking(row),
    timeZone: branch ? branch.timeZone : row.service.availability!.timeZone,
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
  };
};

const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025')
      throw new NotFoundError('Booking not found', { cause: error });
    if (isExclusionViolation(error, BOOKING_NO_OVERLAP))
      throw new ConflictError('Overlaps a booked Turno for this Employee', {
        cause: error,
      });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
