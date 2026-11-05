import { Injectable } from '@nestjs/common';
import { BookingPanelLinks } from '../../domain/calendar/booking-event';
import { NotConfiguredError } from '../../domain/errors';

/** Las direcciones del panel, a partir de `FRONTEND_URL` (la misma que usan los mails). */
@Injectable()
export class EnvBookingPanelLinks implements BookingPanelLinks {
  /** @throws {NotConfiguredError} falta `FRONTEND_URL` */
  bookingUrl(bookingId: number) {
    const base = process.env.FRONTEND_URL;
    if (!base)
      throw new NotConfiguredError(
        'Booking panel links are not configured: missing FRONTEND_URL',
      );
    return `${base.replace(/\/+$/, '')}/bookings/${bookingId}`;
  }
}
