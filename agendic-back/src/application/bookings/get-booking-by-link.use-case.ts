import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientBooking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  ClientFileStreak,
  ClientFileStreakReader,
} from '../streaks/client-file-streak.reader';

const logger = new Logger('GetBookingByLink');

/** Abre el Turno de su Enlace del Turno, en cualquier estado (ADR 0022), con la Racha de su Cliente. */
@Injectable()
export class GetBookingByLinkUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly streaks: ClientFileStreakReader,
  ) {}

  /**
   * La Racha es de la Ficha del Cliente del Turno; si no se puede leer se loguea y queda en null, para que el Turno abra igual.
   *
   * @throws {NotFoundError} el Enlace no corresponde a ningún Turno
   */
  async execute(
    link: string,
  ): Promise<{ booking: ClientBooking; streak: ClientFileStreak | null }> {
    const booking = await this.bookings.findByLink(link);
    try {
      return {
        booking,
        streak: await this.streaks.readOfBooking(
          booking.id,
          booking.clientEmail,
          this.clock.now(),
        ),
      };
    } catch (error) {
      logger.error(
        `Racha of Turno ${booking.id} not read`,
        error instanceof Error ? error.stack : String(error),
      );
      return { booking, streak: null };
    }
  }
}
