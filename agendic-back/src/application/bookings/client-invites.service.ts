import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  addToCalendarLinks,
  buildInviteCalendar,
  ClientInvite,
  InviteMethod,
  inviteEventOf,
} from '../../domain/calendar/client-invite';

const logger = new Logger('ClientInvites');

/**
 * Offset inside each Reagendar's block of two `SEQUENCE` numbers (`2 * moves + step`): the acceptance outranks the
 * REQUEST of its own Reagendar, the CANCEL outranks the acceptance, and the next Reagendar's REQUEST outranks all of
 * them, so a calendar never ignores a message for repeating a number.
 */
const SEQUENCE_STEP = { request: 0, accept: 1, cancel: 2 } as const;

/** The address in `SMTP_FROM`, which may come as `Agendic <turnos@agendic.test>`. */
const organizerEmail = (from: string | undefined) =>
  from?.match(/<([^>]+)>/)?.[1] ?? from ?? 'no-reply@agendic.invalid';

/**
 * Arma el archivo de calendario (`.ics`) que el Cliente recibe con la Confirmación de reserva y con cada Aviso de
 * cambio del Turno, a partir de los Enlaces del Turno.
 *
 * Nunca falla: si el archivo no se puede armar lo loguea y devuelve `undefined`, y el mail sale igual sin él.
 */
@Injectable()
export class ClientInvites {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Confirmación de reserva o Reagendar: crea o mueve el evento de cada Turno, con el `SEQUENCE` de su cadena. */
  request(links: string[]): Promise<ClientInvite | undefined> {
    return this.build('REQUEST', links, SEQUENCE_STEP.request);
  }

  /** Cancelar o Rechazar: borra el evento de cada Turno. */
  cancel(links: string[]): Promise<ClientInvite | undefined> {
    return this.build('CANCEL', links, SEQUENCE_STEP.cancel);
  }

  /** Aceptar turno: el evento tentativo de cada Turno pasa a confirmado, con un `SEQUENCE` por encima del último `REQUEST`. */
  accept(links: string[]): Promise<ClientInvite | undefined> {
    return this.build('REQUEST', links, SEQUENCE_STEP.accept);
  }

  private async build(
    method: InviteMethod,
    links: string[],
    step: number,
  ): Promise<ClientInvite | undefined> {
    try {
      if (links.length === 0) return undefined;
      const frontendUrl = (process.env.FRONTEND_URL ?? '').replace(/\/+$/, '');
      const loaded = await Promise.all(
        links.map(async (link) => {
          const booking = await this.bookings.findByLink(link);
          // Each Reagendar adds an original to the chain and keeps the Enlace del Turno, so the chain's length is how many times it moved.
          const moves = booking.fromRescheduleId
            ? (await this.bookings.findHistoryChain(booking.id)).length - 1
            : 0;
          return {
            booking,
            event: inviteEventOf(booking, frontendUrl, 2 * moves + step),
          };
        }),
      );
      const found = loaded.map(({ event }) => event);
      // A Serie is one Cliente: every Turno shares the name and email of the first.
      const { clientName, clientEmail } = loaded[0].booking;
      return {
        method,
        ics: buildInviteCalendar({
          method,
          events: found,
          organizerEmail: organizerEmail(process.env.SMTP_FROM),
          attendee: { name: clientName, email: clientEmail },
          now: this.clock.now(),
        }),
        events: found.map((event, index) => ({
          link: links[index],
          ...addToCalendarLinks(event),
        })),
      };
    } catch (error) {
      logger.error(
        `Calendar file for ${links.length} Turno(s) not built; the mail goes without it`,
        error instanceof Error ? error.stack : String(error),
      );
      return undefined;
    }
  }
}
