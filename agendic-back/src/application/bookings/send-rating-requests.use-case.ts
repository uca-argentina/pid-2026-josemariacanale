import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { ratingBlocker } from '../../domain/bookings/rating';
import { CLOCK, Clock } from '../../domain/clock';
import { MAILER, Mailer } from '../../domain/mailer';

const HOUR_MS = 3_600_000;
const WAIT_MS = HOUR_MS;
/** Older Turnos are left alone so a first run doesn't sweep the whole history. */
const MAX_AGE_MS = 7 * 24 * HOUR_MS;

const logger = new Logger('SendRatingRequests');

/**
 * Invita por mail a Calificar cada Turno que se puede Calificar, una hora después de que termina y hasta 7 días
 * después. Cada Turno recibe un solo mail: se marca como enviado solo si el envío salió bien.
 *
 * Un mail que falla se loguea y se reintenta en la próxima pasada, como `notifyClients`.
 */
@Injectable()
export class SendRatingRequestsUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Una pasada: manda las invitaciones pendientes.
   *
   * @throws {DatabaseOperationError} falló la base al buscar los Turnos
   */
  async execute(): Promise<void> {
    const now = this.clock.now();
    const candidates = await this.bookings.listUnrequestedByEndsAtBetween(
      new Date(now.getTime() - MAX_AGE_MS),
      new Date(now.getTime() - WAIT_MS),
    );
    for (const booking of candidates) {
      if (booking.link === null || booking.rating || ratingBlocker(booking, now)) continue;
      try {
        await this.mailer.sendRatingRequest(
          booking.clientEmail,
          booking.link,
          booking.service.name,
          booking.startsAt,
          booking.timeZone,
        );
        await this.bookings.markRatingRequestSent(booking.id, now);
      } catch (error) {
        logger.error(
          `Rating request for Turno ${booking.id} failed`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
