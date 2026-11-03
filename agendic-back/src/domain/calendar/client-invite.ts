import { BookingStatus, ClientBooking } from '../bookings/booking';

/** `METHOD` of the archivo de calendario: `REQUEST` creates or moves the event, `CANCEL` removes it. */
export type InviteMethod = 'REQUEST' | 'CANCEL';

/** Un Turno como evento del archivo de calendario del Cliente. */
export interface InviteEvent {
  /** Estable a través de Reagendar: sale del Enlace del Turno, que el Turno nuevo hereda (ADR 0031). */
  uid: string;
  /** Sube con cada Reagendar y con la cancelación, para que el calendario del Cliente aplique el cambio. */
  sequence: number;
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  startsAt: Date;
  endsAt: Date;
  title: string;
  location: string | null;
  description: string;
}

/** Un archivo de calendario listo para adjuntar, con los enlaces "Agregar a Google / Outlook" de cada Turno. */
export interface ClientInvite {
  method: InviteMethod;
  /** Contenido del `.ics`. */
  ics: string;
  events: { link: string; googleUrl: string; outlookUrl: string }[];
}

const CRLF = '\r\n';

const escapeText = (text: string) =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/** A parameter value can't carry `"`, `;`, `:` or `,` unquoted: the name is typed by the Cliente. */
const escapeParam = (name: string) =>
  /[";:,]/.test(name) ? `"${name.replace(/"/g, "'")}"` : name;

/** `20261110T150000Z`: always UTC, so the Cliente's calendar shows it in its own zone. */
const utc = (date: Date) =>
  date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** RFC 5545 §3.1: a content line has at most 75 octets; the rest continues on lines that start with a space. */
const fold = (line: string) => {
  const lines: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    // The continuation lines start with a space that counts too, so they hold one octet less.
    const limit = lines.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      lines.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  lines.push(current);
  return lines.join(CRLF + ' ');
};

/**
 * Arma el archivo de calendario (`.ics`) de uno o más Turnos del Cliente, con un `VEVENT` por Turno.
 *
 * El Cliente figura como invitado y el organizador es la casilla desde la que sale el mail.
 */
export function buildInviteCalendar(input: {
  method: InviteMethod;
  events: InviteEvent[];
  organizerEmail: string;
  attendee: { name: string; email: string };
  now: Date;
}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agendic//Turnos//ES',
    'CALSCALE:GREGORIAN',
    `METHOD:${input.method}`,
  ];
  for (const event of input.events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${utc(input.now)}`,
      `SEQUENCE:${event.sequence}`,
      `DTSTART:${utc(event.startsAt)}`,
      `DTEND:${utc(event.endsAt)}`,
      `STATUS:${event.status}`,
      `SUMMARY:${escapeText(event.title)}`,
    );
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    lines.push(
      `DESCRIPTION:${escapeText(event.description)}`,
      `ORGANIZER:mailto:${input.organizerEmail}`,
      `ATTENDEE;CN=${escapeParam(input.attendee.name)}:mailto:${input.attendee.email}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join(CRLF) + CRLF;
}

/** Los enlaces "Agregar a Google Calendar" y "Agregar a Outlook" de un Turno, con el mismo horario y título que el `.ics`. */
export function addToCalendarLinks(event: InviteEvent): {
  googleUrl: string;
  outlookUrl: string;
} {
  const google = new URL('https://calendar.google.com/calendar/render');
  google.searchParams.set('action', 'TEMPLATE');
  google.searchParams.set('text', event.title);
  google.searchParams.set('dates', `${utc(event.startsAt)}/${utc(event.endsAt)}`);
  google.searchParams.set('details', event.description);
  if (event.location) google.searchParams.set('location', event.location);
  const outlook = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
  outlook.searchParams.set('path', '/calendar/action/compose');
  outlook.searchParams.set('rru', 'addevent');
  outlook.searchParams.set('subject', event.title);
  outlook.searchParams.set('startdt', event.startsAt.toISOString());
  outlook.searchParams.set('enddt', event.endsAt.toISOString());
  outlook.searchParams.set('body', event.description);
  if (event.location) outlook.searchParams.set('location', event.location);
  return { googleUrl: google.toString(), outlookUrl: outlook.toString() };
}

/**
 * El evento de un Turno: título con el Servicio y el Negocio (o el nombre del Usuario, en un Servicio personal),
 * ubicación en la Sucursal y el Enlace del Turno en la descripción.
 */
export function inviteEventOf(
  booking: ClientBooking,
  frontendUrl: string,
  sequence: number,
): InviteEvent {
  const status =
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.REJECTED
      ? 'CANCELLED'
      : booking.status === BookingStatus.PENDING
        ? 'TENTATIVE'
        : 'CONFIRMED';
  return {
    uid: `${booking.link}@agendic`,
    sequence,
    status,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    title: `${booking.service.name} · ${booking.business?.name ?? booking.employeeName}`,
    location: booking.branch ? `${booking.branch.name}, ${booking.branch.address}` : null,
    description: `Tu Turno: ${frontendUrl}/turnos/${booking.link}`,
  };
}
