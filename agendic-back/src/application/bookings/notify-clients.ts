import { Logger } from '@nestjs/common';
import { ClientNotice } from '../../domain/bookings/booking';

const logger = new Logger('NotifyClients');

/**
 * Manda el Aviso de cambio del Turno a cada Cliente, una vez que el cambio ya quedó guardado.
 *
 * Un mail que falla se loguea y no se propaga: el Turno ya cambió, y responder 500 (o cortar la baja de un Usuario
 * antes de borrarlo en Clerk) no lo desharía.
 */
export async function notifyClients(
  bookings: ClientNotice[],
  send: (email: string, link: string, reason: string | null) => Promise<void>,
): Promise<void> {
  // A Turno without Enlace is an original already replaced by Reagendar: nobody to send it to.
  const notices = bookings.filter((b) => b.link !== null);
  const results = await Promise.allSettled(
    notices.map(({ clientEmail, link, cancellationReason }) =>
      send(clientEmail, link!, cancellationReason ?? null),
    ),
  );
  results.forEach((result, index) => {
    if (result.status === 'rejected')
      logger.error(
        `Turno change notice to ${notices[index].clientEmail} failed`,
        result.reason instanceof Error ? result.reason.stack : String(result.reason),
      );
  });
}
