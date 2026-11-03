import { BookingStatus, ClientBooking } from '../../domain/bookings/booking';
import { BookingsRepository } from '../../domain/bookings/bookings.repository';
import { Clock } from '../../domain/clock';
import { ClientInvites } from './client-invites.service';

const booking = (over: Partial<ClientBooking> = {}) =>
  ({
    id: 5,
    link: 'abc123',
    status: BookingStatus.BOOKED,
    fromRescheduleId: null,
    clientName: 'Ana',
    clientEmail: 'ana@mail.test',
    startsAt: new Date('2026-11-10T15:00:00.000Z'),
    endsAt: new Date('2026-11-10T16:00:00.000Z'),
    employeeName: 'Luis',
    service: { name: 'Corte' },
    business: { name: 'Peluquería' },
    branch: { name: 'Centro', address: 'Calle 1' },
    ...over,
  }) as ClientBooking;

describe('ClientInvites', () => {
  const findByLink = jest.fn();
  const findHistoryChain = jest.fn();
  const clock: Clock = { now: () => new Date('2026-11-03T12:00:00.000Z') };
  const invites = new ClientInvites(
    { findByLink, findHistoryChain } as unknown as BookingsRepository,
    clock,
  );

  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://agendic.test';
    process.env.SMTP_FROM = 'Agendic <turnos@agendic.test>';
    findByLink.mockReset();
    findHistoryChain.mockReset();
  });

  it('requests the Turno with SEQUENCE 0 the first time', async () => {
    findByLink.mockResolvedValue(booking());

    const invite = await invites.request(['abc123']);

    expect(invite?.method).toBe('REQUEST');
    expect(invite?.ics).toContain('SEQUENCE:0');
    expect(invite?.ics).toContain('ORGANIZER:mailto:turnos@agendic.test');
    expect(invite?.events[0].googleUrl).toContain('calendar.google.com');
  });

  it('keeps the UID and raises the SEQUENCE for each Reagendar of the chain', async () => {
    findByLink.mockResolvedValue(booking({ id: 7, fromRescheduleId: 6 }));
    findHistoryChain.mockResolvedValue([{ id: 5 }, { id: 6 }, { id: 7 }]);

    const invite = await invites.request(['abc123']);

    expect(invite?.ics).toContain('UID:abc123@agendic');
    expect(invite?.ics).toContain('SEQUENCE:2');
  });

  it('cancels every Turno of a Serie with a SEQUENCE above its last REQUEST', async () => {
    findByLink.mockImplementation(async (link: string) => booking({ link }));

    const invite = await invites.cancel(['a1', 'b2']);

    expect(invite?.ics).toContain('METHOD:CANCEL');
    expect(invite?.ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(invite?.ics).toContain('UID:a1@agendic');
    expect(invite?.ics).toContain('UID:b2@agendic');
    expect(invite?.ics).toContain('SEQUENCE:1');
  });

  it('returns nothing, without failing, when the file cannot be built', async () => {
    findByLink.mockRejectedValue(new Error('db down'));

    await expect(invites.request(['abc123'])).resolves.toBeUndefined();
  });
});
