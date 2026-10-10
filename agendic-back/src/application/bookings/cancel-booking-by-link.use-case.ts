import { Inject, Injectable } from '@nestjs/common';
import { ClientBooking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { MAILER, Mailer } from '../../domain/mailer';
import { notifyClients } from './notify-clients';
import { cancelResolvedBooking } from './cancel-resolved-booking';
import { findBookingByLink } from './find-booking-by-link';

/** Cancela un Turno pendiente o aceptado por su Enlace del Turno, hasta que empieza (ADR 0022), y le avisa por mail al Cliente. */
@Injectable()
export class CancelBookingByLinkUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /**
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado, o ya empezó
   */
  async execute(link: string): Promise<ClientBooking> {
    const booking = await findBookingByLink(this.bookings, link);
    const cancelled = await cancelResolvedBooking(
      this.bookings,
      this.clock,
      booking,
    );
    await notifyClients([cancelled], (email, link) =>
      this.mailer.sendBookingCancellation(email, link),
    );
    return cancelled;
  }
}
