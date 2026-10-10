import { Logger } from '@nestjs/common';
import { CancelledBooking } from '../../domain/bookings/booking';

const logger = new Logger('NotifyClients');

/**
 * Manda el Aviso de cambio del Turno a cada Cliente, una vez que el cambio ya quedó guardado.
 *
 * Un mail que falla se loguea y no se propaga: el Turno ya cambió, y responder 500 (o cortar la baja de un Usuario
 * antes de borrarlo en Clerk) no lo desharía.
 */
export async function notifyClients(
  bookings: CancelledBooking[],
  send: (email: string, link: string) => Promise<void>,
): Promise<void> {
  const results = await Promise.allSettled(
    bookings.map(({ clientEmail, link }) => send(clientEmail, link)),
  );
  results.forEach((result, index) => {
    if (result.status === 'rejected')
      logger.error(
        `Aviso de cambio del Turno to ${bookings[index].clientEmail} failed`,
        result.reason instanceof Error ? result.reason.stack : String(result.reason),
      );
  });
}
