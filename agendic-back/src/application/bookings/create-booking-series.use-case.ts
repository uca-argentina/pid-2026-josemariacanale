import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BOOKING_VERIFICATION_CODES,
  BookingVerificationCodes,
} from '../../domain/bookings/booking-verification-codes';
import {
  Booking,
  BookingStatus,
  CreateBookingInput,
  depositAmountFor,
  SeriesRepeat,
  seriesDatesNotAvailable,
} from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
  SeriesBookingData,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  BadRequestError,
  BusinessRuleError,
  ConflictError,
  InvalidCodeError,
  NotFoundError,
} from '../../domain/errors';
import { MAILER, Mailer } from '../../domain/mailer';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { localDayBounds } from '../../domain/slots/slot';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';
import { ListSeriesSlotsUseCase } from '../slots/list-series-slots.use-case';
import { assertBookable } from './assert-booking-rules';
import { freeCabinsInOrder } from './pick-cabin';

/** La Serie reservada: el primer Turno con el nombre de quien atiende, y los Enlaces de todos. */
export type BookedSeries = Booking & {
  employeeName: string;
  series: { id: string; bookings: { startsAt: Date; link: string }[] };
};

/**
 * Reserva una Serie de Turnos de un Servicio con Repetición (#303) con un solo Código de verificación. Todos van con el
 * mismo Empleado y `employeeChosen` (el de `ListSeriesSlotsUseCase`), a la misma hora local, y se crean todos o ninguno.
 */
@Injectable()
export class CreateBookingSeriesUseCase {
  constructor(
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(BOOKING_VERIFICATION_CODES)
    private readonly codes: BookingVerificationCodes,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAILER) private readonly mailer: Mailer,
    private readonly seriesSlots: ListSeriesSlotsUseCase,
  ) {}

  /**
   * El código sigue valiendo para reintentar después de un 409, así que no se gasta. La Confirmación de reserva sale una
   * sola vez, con el Enlace del primer Turno. Si `startsAt` mismo no es reservable responde 422 como un Turno suelto,
   * aunque esté en `skipDates`.
   *
   * @throws {InvalidCodeError} el código no es válido para clientEmail en su ventana
   * @throws {NotFoundError} el Servicio no existe o está dado de baja, o el Empleado elegido no lo Ofrece
   * @throws {BadRequestError} `count` fuera de 2 al máximo de la Repetición, una fecha de `skipDates` no es de la Serie, o se eligió un Empleado en un Servicio personal
   * @throws {BusinessRuleError} el Servicio no tiene Repetición, `startsAt` no es reservable, o quedan menos de 2 Turnos (`A Serie needs at least 2 Turnos`)
   * @throws {ConflictError} `Series dates not available: <fechas>`: no se puede reservar esas fechas, y no se creó ningún Turno
   */
  async execute(
    input: CreateBookingInput & { repeat: SeriesRepeat },
  ): Promise<BookedSeries> {
    const now = this.clock.now();
    if (!this.codes.verify(input.clientEmail, input.code))
      throw new InvalidCodeError(
        `Invalid or expired verification code for ${input.clientEmail}`,
      );
    const { employeeId, dates } = await this.seriesSlots.execute(
      input.serviceId,
      input.startsAt,
      input.repeat.count,
      input.employeeId,
    );
    const skipped = new Set(input.repeat.skipDates ?? []);
    const inSerie = new Set(dates.map(({ date }) => date));
    const outside = [...skipped].filter((date) => !inSerie.has(date));
    if (outside.length > 0)
      throw new BadRequestError(
        `skipDates are not dates of the Serie: ${outside.join(',')}`,
      );
    const booked = dates.filter(({ date }) => !skipped.has(date));
    if (booked.length < 2)
      throw new BusinessRuleError('A Serie needs at least 2 Turnos');
    const busy = booked.filter(({ available }) => !available).map(({ date }) => date);
    if (busy.length > 0) throw new ConflictError(seriesDatesNotAvailable(busy));

    const { service, timeZone } = await assertBookable(
      this.services,
      this.branches,
      this.availabilities,
      input.serviceId,
      undefined,
      input.startsAt,
      now,
    );
    const employee = service.employees.find(({ id }) => id === employeeId);
    const userId = employee ? employee.userId : service.userId!;
    const status = service.requiresApproval
      ? BookingStatus.PENDING
      : BookingStatus.BOOKED;
    // Fixed now, as in a Turno suelto: a later change to the price or the Seña of the Servicio doesn't touch them.
    const depositAmount = depositAmountFor(service.price, service.depositPercent);

    const noCabin: string[] = [];
    const items: SeriesBookingData[] = [];
    for (const { date, startsAt: iso } of booked) {
      const startsAt = new Date(iso);
      const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
      const prepStartsAt = new Date(startsAt.getTime() - service.prepMinutes * 60_000);
      const cabinIds = await freeCabinsInOrder(this.bookings, service, prepStartsAt, endsAt);
      if (service.cabins.length > 0 && cabinIds.length === 0) noCabin.push(date);
      let dailyLimit: SeriesBookingData['dailyLimit'];
      if (service.dailyLimit !== null) {
        const { from, to } = localDayBounds(startsAt, timeZone);
        dailyLimit = { serviceId: service.id, limit: service.dailyLimit, from, to };
      }
      items.push({
        date,
        cabinIds,
        dailyLimit,
        data: {
          serviceId: input.serviceId,
          employeeId: employeeId,
          userId,
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          prepStartsAt,
          startsAt,
          endsAt,
          notes: input.notes || null, // a blank Comentario del Turno is no Comentario
          employeeChosen: input.employeeId !== undefined,
          depositAmount,
          price: service.price,
          status,
          acceptedAt: status === BookingStatus.BOOKED ? now : null,
        },
      });
    }
    if (noCabin.length > 0) throw new ConflictError(seriesDatesNotAvailable(noCabin));

    const created = await this.bookings.createSeries(items);
    const first = created[0];
    const attendingUser = employee ? null : await this.users.findById(userId);
    if (!employee && !attendingUser)
      throw new NotFoundError(`User ${userId} not found`);
    await this.mailer.sendBookingConfirmation(
      input.clientEmail,
      first.link!,
      first.depositAmount,
    );
    return {
      ...first,
      employeeName: (employee ?? attendingUser!).name,
      series: {
        id: first.seriesId!,
        bookings: created.map(({ startsAt, link }) => ({ startsAt, link: link! })),
      },
    };
  }
}
