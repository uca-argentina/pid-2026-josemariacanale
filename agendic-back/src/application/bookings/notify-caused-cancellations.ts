import { Logger } from '@nestjs/common';
import { Mailer } from '../../domain/mailer';

const logger = new Logger('NotifyCausedCancellations');

/** Un Turno cancelado por un cambio en el horario de quien lo atiende, con lo que el mail necesita de él. */
export interface CausedCancellationNotice {
  clientEmail: string;
  /** Enlace del Turno; null en un original ya reemplazado por Reagendar, que no se avisa. */
  link: string | null;
  serviceName: string;
  startsAt: Date;
  /** The zone the Cliente sees `startsAt` in. */
  clientTimeZone: string;
  cancellationReason: string;
  /** La Serie a la que pertenece; null o ausente si no tiene. */
  seriesId?: number | null;
}

/**
 * Manda el Aviso de cambio del Turno con Causa, una vez que la cancelación ya quedó guardada: un mail por Serie con todas
 * sus fechas canceladas y un mail por Turno si no tiene Serie.
 *
 * Un mail que falla se loguea y no se propaga: los Turnos ya están cancelados y responder 500 no los desharía.
 */
export async function notifyCausedCancellations(
  mailer: Mailer,
  cancelled: CausedCancellationNotice[],
): Promise<void> {
  const groups = new Map<string, CausedCancellationNotice[]>();
  for (const [index, notice] of cancelled.entries()) {
    if (notice.link === null) continue;
    const key =
      notice.seriesId == null
        ? `booking:${index}`
        : `series:${notice.seriesId}:${notice.clientEmail}`;
    groups.set(key, [...(groups.get(key) ?? []), notice]);
  }
  const batches = [...groups.values()];
  const results = await Promise.allSettled(
    batches.map((notices) =>
      mailer.sendBookingCancellationWithCause(
        notices[0].clientEmail,
        notices.map((n) => ({
          link: n.link!,
          serviceName: n.serviceName,
          startsAt: n.startsAt,
          timeZone: n.clientTimeZone,
          reason: n.cancellationReason,
        })),
      ),
    ),
  );
  results.forEach((result, index) => {
    if (result.status === 'rejected')
      logger.error(
        `Aviso con Causa to ${batches[index][0].clientEmail} failed`,
        result.reason instanceof Error ? result.reason.stack : String(result.reason),
      );
  });
}
