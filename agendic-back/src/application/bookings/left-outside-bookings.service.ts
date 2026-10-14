import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import { CancellationCause, UpcomingBooking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { cancellationReasonFor } from '../../domain/bookings/cancellation-reason';
import { CLOCK, Clock } from '../../domain/clock';
import { NotFoundError } from '../../domain/errors';
import { OutOfOffice, OutOfOfficeFields } from '../../domain/out-of-office/out-of-office';
import {
  OUT_OF_OFFICE_REPOSITORY,
  OutOfOfficeRepository,
} from '../../domain/out-of-office/out-of-office.repository';
import { bookingsLeftOutside, UserSchedule } from '../../domain/slots/bookings-left-outside';
import { addDays } from '../../domain/slots/slot';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';
import { ListUserHolidayPeriodsUseCase } from '../holidays/list-user-holiday-periods.use-case';

/** Un Turno que un cambio en el horario deja afuera (ADR 0034), con la Causa y el Motivo de cancelación que se le van a escribir. */
export interface LeftOutsideBooking extends UpcomingBooking {
  cancellationCause: CancellationCause;
  cancellationReason: string;
}

const DAY_MS = 86_400_000;

/**
 * Arma el horario de un Usuario antes y después de un cambio y devuelve los Turnos que el cambio deja afuera (ADR 0034),
 * cada uno con su Causa y su Motivo de cancelación. Es lo que usan la vista previa y la escritura de cada tipo de cambio;
 * acá está el período Fuera de la oficina nuevo.
 *
 * La Causa sale de qué se está guardando, no del Motivo del período: un período con Motivo "Día festivo" sigue siendo
 * `OUT_OF_OFFICE`.
 */
@Injectable()
export class LeftOutsideBookingsService {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    @Inject(OUT_OF_OFFICE_REPOSITORY)
    private readonly outOfOffice: OutOfOfficeRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    private readonly holidayPeriods: ListUserHolidayPeriodsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Los Turnos pendientes o aceptados del Usuario, que todavía no empezaron, que un período Fuera de la oficina deja
   * afuera, por `startsAt`. Los que otro período o un Día festivo ya bloqueaban no se devuelven.
   *
   * Al editar, `replacing` es el período como estaba: cuenta en el horario de antes y no en el de después, donde lo
   * reemplaza `period`. Así solo quedan afuera los Turnos de los días que se suman.
   *
   * @throws {NotFoundError} el Usuario no existe
   */
  async forOutOfOffice(
    userId: number,
    period: OutOfOfficeFields,
    replacing?: OutOfOffice,
  ): Promise<LeftOutsideBooking[]> {
    const now = this.clock.now();
    // A day either side (wider than any UTC offset) keeps every local date of the período inside the window.
    const spanStart =
      replacing && replacing.startDate < period.startDate ? replacing.startDate : period.startDate;
    const spanEnd =
      replacing && replacing.endDate > period.endDate ? replacing.endDate : period.endDate;
    const windowStart = new Date(Date.parse(`${spanStart}T00:00:00.000Z`) - DAY_MS);
    const windowEnd = new Date(Date.parse(`${spanEnd}T00:00:00.000Z`) + 2 * DAY_MS);
    const from = windowStart > now ? windowStart : now;
    if (from >= windowEnd) return [];

    const [user, upcoming, existing, holidays] = await Promise.all([
      this.users.findById(userId),
      this.bookings.listUpcomingByUser(userId, from, windowEnd),
      this.outOfOffice.listByUserEndingFrom(userId, addDays(spanStart, -1)),
      this.holidayPeriods.execute(
        userId,
        addDays(spanStart, -1),
        addDays(spanEnd, 1),
      ),
    ]);
    if (!user) throw new NotFoundError(`User ${userId} not found`);

    const availabilityIds = [...new Set(upcoming.map((b) => b.availabilityId))];
    const availabilities = (
      await Promise.all(availabilityIds.map((id) => this.availabilities.findById(id)))
    ).filter((a) => a !== null);

    const before: UserSchedule = { availabilities, blocked: [...existing, ...holidays] };
    const after: UserSchedule = {
      availabilities,
      blocked: [...existing.filter(({ id }) => id !== replacing?.id), ...holidays, period],
    };
    const cancellationReason = cancellationReasonFor({
      cause: CancellationCause.OUT_OF_OFFICE,
      userName: user.name,
      notes: period.notes,
      showNotePublicly: period.showNotePublicly,
    });
    return bookingsLeftOutside(upcoming, before, after).map(({ booking }) => ({
      ...booking,
      cancellationCause: CancellationCause.OUT_OF_OFFICE,
      cancellationReason,
    }));
  }
}
