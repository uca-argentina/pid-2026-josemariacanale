import { Logger } from '@nestjs/common';
import { Booking, ClientNotice } from '../../domain/bookings/booking';
import { ClientInvite } from '../../domain/calendar/client-invite';
import { SeriesNotice } from '../../domain/mailer';

/** Arma el archivo de calendario de los Turnos con esos Enlaces del Turno; nunca falla (ver `ClientInvites`). */
export type InviteFor = (links: string[]) => Promise<ClientInvite | undefined>;

const logger = new Logger('NotifyClients');

/**
 * Manda el Aviso de cambio del Turno a cada Cliente, una vez que el cambio ya quedó guardado.
 *
 * Un mail que falla se loguea y no se propaga: el Turno ya cambió, y responder 500 (o cortar la baja de un Usuario
 * antes de borrarlo en Clerk) no lo desharía.
 *
 * Con `inviteFor`, cada aviso lleva el archivo de calendario de su Turno (#404).
 */
export async function notifyClients(
  bookings: ClientNotice[],
  send: (
    email: string,
    link: string,
    reason: string | null,
    invite?: ClientInvite,
  ) => Promise<void>,
  inviteFor?: InviteFor,
): Promise<void> {
  // A Turno without Enlace is an original already replaced by Reagendar: nobody to send it to.
  const notices = bookings.filter((b) => b.link !== null);
  const results = await Promise.allSettled(
    notices.map(async ({ clientEmail, link, cancellationReason }) =>
      send(
        clientEmail,
        link!,
        cancellationReason ?? null,
        await inviteFor?.([link!]),
      ),
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

/**
 * Manda un solo Aviso de cambio del Turno por una acción sobre varios Turnos de una Serie (#305): al Cliente, con
 * todas las fechas afectadas, el Motivo de cancelación y el Enlace del Turno del primero. Con un solo Turno afectado
 * manda el aviso de siempre.
 *
 * Como `notifyClients`, un mail que falla (o la zona que no se pudo leer) se loguea y no se propaga.
 */
export async function notifySeries(
  bookings: (ClientNotice & Pick<Booking, 'startsAt'>)[],
  timeZoneOf: () => Promise<string>,
  send: (
    email: string,
    link: string,
    reason: string | null,
    series?: SeriesNotice,
    invite?: ClientInvite,
  ) => Promise<void>,
  inviteFor?: InviteFor,
): Promise<void> {
  const notices = bookings.filter((b) => b.link !== null);
  if (notices.length === 0) return;
  if (notices.length === 1)
    return notifyClients(
      notices,
      (email, link, reason, invite) =>
        invite ? send(email, link, reason, undefined, invite) : send(email, link, reason),
      inviteFor,
    );
  // A Serie is one Cliente: every Turno shares the email of the first.
  const [first] = notices;
  try {
    await send(
      first.clientEmail,
      first.link!,
      first.cancellationReason ?? null,
      {
        bookings: notices.map(({ startsAt, link }) => ({ startsAt, link: link! })),
        timeZone: await timeZoneOf(),
      },
      await inviteFor?.(notices.map(({ link }) => link!)),
    );
  } catch (error) {
    logger.error(
      `Serie change notice to ${first.clientEmail} failed`,
      error instanceof Error ? error.stack : String(error),
    );
  }
}
