import { BookingStatus, ClientBooking } from '../bookings/booking';
import {
  addToCalendarLinks,
  buildInviteCalendar,
  inviteEventOf,
  InviteEvent,
} from './client-invite';

const event = (over: Partial<InviteEvent> = {}): InviteEvent => ({
  uid: 'abc123@agendic',
  sequence: 0,
  status: 'CONFIRMED',
  startsAt: new Date('2026-11-10T15:00:00.000Z'),
  endsAt: new Date('2026-11-10T16:00:00.000Z'),
  title: 'Corte · Peluquería',
  location: 'Sucursal Centro, Calle 1',
  description: 'Tu Turno: https://agendic.test/turnos/abc123',
  ...over,
});

const build = (events: InviteEvent[], method: 'REQUEST' | 'CANCEL' = 'REQUEST') =>
  buildInviteCalendar({
    method,
    events,
    organizerEmail: 'turnos@agendic.test',
    attendee: { name: 'Ana', email: 'ana@mail.test' },
    now: new Date('2026-11-03T12:00:00.000Z'),
  });

describe('buildInviteCalendar', () => {
  it('builds a REQUEST with the Turno in UTC and CRLF lines', () => {
    const ics = build([event()]);
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('METHOD:REQUEST\r\n');
    expect(ics).toContain('UID:abc123@agendic\r\n');
    expect(ics).toContain('DTSTART:20261110T150000Z\r\n');
    expect(ics).toContain('DTEND:20261110T160000Z\r\n');
    expect(ics).toContain('DTSTAMP:20261103T120000Z\r\n');
    expect(ics).toContain('STATUS:CONFIRMED\r\n');
    expect(ics).toContain('SEQUENCE:0\r\n');
    expect(ics).toContain('ATTENDEE;CN=Ana:mailto:ana@mail.test\r\n');
    expect(ics).toContain('ORGANIZER:mailto:turnos@agendic.test\r\n');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('marks a pending Turno as TENTATIVE', () => {
    expect(build([event({ status: 'TENTATIVE' })])).toContain('STATUS:TENTATIVE\r\n');
  });

  it('puts one VEVENT per Turno of a Serie, each with its own UID', () => {
    const ics = build([event(), event({ uid: 'def456@agendic' })]);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('UID:abc123@agendic');
    expect(ics).toContain('UID:def456@agendic');
  });

  it('carries the SEQUENCE of a Reagendar', () => {
    expect(build([event({ sequence: 2 })])).toContain('SEQUENCE:2\r\n');
  });

  it('builds a CANCEL with STATUS:CANCELLED per Turno', () => {
    const ics = build([event({ status: 'CANCELLED' })], 'CANCEL');
    expect(ics).toContain('METHOD:CANCEL\r\n');
    expect(ics).toContain('STATUS:CANCELLED\r\n');
  });

  it('escapes the text values', () => {
    const ics = build([event({ title: 'A, B; C\\D', description: 'uno\ndos' })]);
    expect(ics).toContain('SUMMARY:A\\, B\\; C\\\\D\r\n');
    expect(ics).toContain('DESCRIPTION:uno\\ndos\r\n');
  });

  it('folds lines longer than 75 octets', () => {
    const ics = build([event({ description: 'ñ'.repeat(100) })]);
    for (const line of ics.split('\r\n'))
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    expect(ics.replace(/\r\n /g, '')).toContain('ñ'.repeat(100));
  });

  it('leaves out LOCATION when there is none', () => {
    expect(build([event({ location: null })])).not.toContain('LOCATION');
  });
});

describe('addToCalendarLinks', () => {
  it('carries the same horario and title in the Google and Outlook links', () => {
    const { googleUrl, outlookUrl } = addToCalendarLinks(event());
    const google = new URL(googleUrl);
    expect(google.searchParams.get('text')).toBe('Corte · Peluquería');
    expect(google.searchParams.get('dates')).toBe('20261110T150000Z/20261110T160000Z');
    const outlook = new URL(outlookUrl);
    expect(outlook.searchParams.get('subject')).toBe('Corte · Peluquería');
    expect(outlook.searchParams.get('startdt')).toBe('2026-11-10T15:00:00.000Z');
    expect(outlook.searchParams.get('enddt')).toBe('2026-11-10T16:00:00.000Z');
  });
});

describe('inviteEventOf', () => {
  const booking = {
    status: BookingStatus.BOOKED,
    link: 'abc123',
    startsAt: new Date('2026-11-10T15:00:00.000Z'),
    endsAt: new Date('2026-11-10T16:00:00.000Z'),
    employeeName: 'Luis',
    service: { name: 'Corte' },
    business: { name: 'Peluquería' },
    branch: { name: 'Centro', address: 'Calle 1' },
  } as ClientBooking;

  it('titles it with the Servicio and the Negocio, located at the Sucursal, with the Enlace del Turno', () => {
    expect(inviteEventOf(booking, 'https://agendic.test', 1)).toEqual({
      uid: 'abc123@agendic',
      sequence: 1,
      status: 'CONFIRMED',
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      title: 'Corte · Peluquería',
      location: 'Centro, Calle 1',
      description: 'Tu Turno: https://agendic.test/turnos/abc123',
    });
  });

  it('titles a Servicio personal with the name of the Usuario, without location', () => {
    const personal = { ...booking, business: null, branch: null, status: BookingStatus.PENDING };
    const result = inviteEventOf(personal, 'https://agendic.test', 0);
    expect(result.title).toBe('Corte · Luis');
    expect(result.location).toBeNull();
    expect(result.status).toBe('TENTATIVE');
  });

  it('is CANCELLED once the Turno was cancelled or rejected', () => {
    for (const status of [BookingStatus.CANCELLED, BookingStatus.REJECTED])
      expect(inviteEventOf({ ...booking, status }, 'https://agendic.test', 0).status).toBe('CANCELLED');
  });
});
