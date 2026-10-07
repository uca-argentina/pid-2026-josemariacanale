import { Inject, Injectable } from '@nestjs/common';
import { ClientBooking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { BusinessRuleError } from '../../domain/errors';
import { findClientBooking } from './find-client-booking';

/** Cancela un Turno pendiente o aceptado del Cliente, hasta que empieza (ADR 0022). */
@Injectable()
export class CancelClientBookingUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @throws {NotFoundError} el Turno no existe o no es de este email
   * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado, o ya empezó
   */
  async execute(email: string, bookingId: number): Promise<ClientBooking> {
    const booking = await findClientBooking(this.bookings, email, bookingId);
    if (booking.startsAt <= this.clock.now())
      throw new BusinessRuleError(`Turno ${bookingId} already started`);
    return this.bookings.cancelPendingOrBooked(bookingId);
  }
}
