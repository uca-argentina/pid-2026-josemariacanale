import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import { Booking, BookingStatus } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { localDayBounds } from '../../domain/slots/slot';
import { assertBookable } from './assert-booking-rules';

/**
 * Re-checks the booking rules of `assertBookable`, the overlap and the Límite diario at verification time,
 * since it has been up to 24h since the request. It does not re-check the Horario reservable.
 */
@Injectable()
export class VerifyBookingUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Verifica el Turno y lo deja aceptado, o pendiente si el Servicio tiene Aprobación manual.
   *
   * @throws {BusinessRuleError} el token no sirve, o alguna regla de Reservar dejó de cumplirse
   * @throws {ConflictError} otro Turno del Empleado ya ocupa el horario, o el Servicio alcanzó su Límite diario ese día
   */
  async execute(token: string): Promise<Booking> {
    const now = this.clock.now();
    const booking = await this.bookings.findByVerificationToken(token, now);
    const { service, timeZone } = await assertBookable(
      this.services,
      this.branches,
      this.availabilities,
      booking.serviceId,
      booking.employeeId ?? undefined,
      booking.startsAt,
      now,
    );
    const status = service.requiresApproval
      ? BookingStatus.PENDING
      : BookingStatus.BOOKED;
    if (service.dailyLimit === null)
      return this.bookings.markVerified(booking.id, status);
    const { from, to } = localDayBounds(booking.startsAt, timeZone);
    return this.bookings.markVerified(booking.id, status, {
      serviceId: service.id,
      limit: service.dailyLimit,
      from,
      to,
    });
  }
}
