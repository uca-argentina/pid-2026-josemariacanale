import { Inject, Injectable } from '@nestjs/common';
import { ClientBooking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { BusinessRuleError } from '../../domain/errors';
import { MAILER, Mailer } from '../../domain/mailer';
import { findBookingByLink } from './find-booking-by-link';
import { notifySeries } from './notify-clients';
import { serieOf } from './serie-of';

/**
 * Cancela, por su Enlace del Turno, ese Turno y los siguientes de su Serie (#305, ADR 0032). Manda un solo Aviso de
 * cambio del Turno con todas las fechas.
 */
@Injectable()
export class CancelBookingSeriesByLinkUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /**
   * @returns `cancelled`, los Turnos cancelados, y `kept`, los que el Plazo de cambios deja en pie: vacío mientras
   * el Plazo de cambios no exista en el código
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   * @throws {BusinessRuleError} el Turno no está pendiente ni aceptado, ya empezó o no es de una Serie
   */
  async execute(
    link: string,
    reason: string | null = null,
  ): Promise<{ cancelled: ClientBooking[]; kept: ClientBooking[] }> {
    const booking = await findBookingByLink(this.bookings, link);
    const now = this.clock.now();
    if (booking.startsAt <= now)
      throw new BusinessRuleError(`Turno ${booking.id} already started`);
    const cancelled = await this.bookings.cancelSeriesFromByLink(
      serieOf(booking),
      booking.startsAt,
      now,
      reason,
    );
    await notifySeries(
      cancelled,
      async () => booking.timeZone,
      (...notice) => this.mailer.sendBookingCancellation(...notice),
    );
    return { cancelled, kept: [] };
  }
}
