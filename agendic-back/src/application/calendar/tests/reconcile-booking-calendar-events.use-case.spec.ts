import { BookingStatus } from '../../../domain/bookings/booking';
import {
  BookingCalendarEventsRepository,
  LiveBookingWithEvent,
  StoredBookingEvent,
} from '../../../domain/calendar/booking-calendar-events.repository';
import { CalendarConnectionsRepository } from '../../../domain/calendar/calendar-connections.repository';
import {
  CalendarAccessRevokedError,
  CalendarEvents,
} from '../../../domain/calendar/calendar-events';
import { ExternalServiceError } from '../../../domain/errors';
import { ReconcileBookingCalendarEventsUseCase } from '../reconcile-booking-calendar-events.use-case';

const NOW = new Date('2026-11-03T12:00:00Z');

const live = (
  overrides: Partial<LiveBookingWithEvent> = {},
): LiveBookingWithEvent => ({
  id: 1,
  userId: 10,
  status: BookingStatus.BOOKED,
  startsAt: new Date('2026-11-05T15:00:00Z'),
  endsAt: new Date('2026-11-05T16:00:00Z'),
  notes: null,
  clientName: 'Ana',
  clientEmail: 'ana@example.com',
  serviceName: 'Corte',
  businessName: 'Peluquería',
  branchName: 'Centro',
  branchAddress: 'Calle 1',
  fromRescheduleId: null,
  event: null,
  ...overrides,
});

const stored = (
  bookingId: number,
  over: Partial<StoredBookingEvent> = {},
): StoredBookingEvent => ({
  bookingId,
  userId: 10,
  googleEventId: `old-${bookingId}`,
  fingerprint: 'stale',
  ...over,
});

/**
 * In-memory ports: an events table that follows what the use case saves, moves and deletes, and a Google that
 * remembers what is in the calendar. `bookings` is read on every pass, so a test can change a Turno between passes.
 */
const setup = (
  bookings: LiveBookingWithEvent[],
  endedRows: StoredBookingEvent[] = [],
) => {
  const table = new Map<number, StoredBookingEvent>();
  for (const row of endedRows) table.set(row.bookingId, row);
  const calendar = new Map<string, string>();
  let nextId = 1;

  const events = {
    listLiveOfConnectedUsers: jest.fn(async () =>
      bookings.map((b) => ({ ...b, event: table.get(b.id) ?? null })),
    ),
    listOfEndedBookingsOfConnectedUsers: jest.fn(async () =>
      endedRows
        .filter((r) => table.has(r.bookingId))
        .map((r) => table.get(r.bookingId)!),
    ),
    findEventOfPreviousBooking: jest.fn(async (bookingId: number) => {
      const from = bookings.find((b) => b.id === bookingId)?.fromRescheduleId;
      return from == null ? null : (table.get(from) ?? null);
    }),
    save: jest.fn(
      async (event: StoredBookingEvent) =>
        void table.set(event.bookingId, event),
    ),
    moveToBooking: jest.fn(async (from: number, to: number) => {
      const row = table.get(from)!;
      table.delete(from);
      table.set(to, { ...row, bookingId: to });
    }),
    deleteByBookingId: jest.fn(async (id: number) => void table.delete(id)),
  } as unknown as jest.Mocked<BookingCalendarEventsRepository>;
  const connections = {
    findCredentialsByUserId: jest.fn(async (userId: number) => ({
      provider: 'GOOGLE' as const,
      refreshToken: `token-${userId}`,
    })),
    markDisconnected: jest.fn(),
  } as unknown as jest.Mocked<CalendarConnectionsRepository>;
  const google = {
    createEvent: jest.fn(async (_token: string, content: { title: string }) => {
      const id = `evt-${nextId++}`;
      calendar.set(id, content.title);
      return id;
    }),
    updateEvent: jest.fn(
      async (_token: string, id: string, content: { title: string }) => {
        if (!calendar.has(id)) return false;
        calendar.set(id, content.title);
        return true;
      },
    ),
    deleteEvent: jest.fn(
      async (_token: string, id: string) => void calendar.delete(id),
    ),
  } as unknown as jest.Mocked<CalendarEvents>;
  const useCase = new ReconcileBookingCalendarEventsUseCase(
    events,
    connections,
    google,
    { bookingUrl: (id) => `https://agendic.test/bookings/${id}` },
    { now: () => NOW },
  );
  return { useCase, events, connections, google, table, calendar };
};

describe('ReconcileBookingCalendarEventsUseCase', () => {
  it('creates the Evento del Turno with the Cliente, the place and the link', async () => {
    const { useCase, google } = setup([live({ notes: 'Alergia al tinte' })]);

    await useCase.execute();

    expect(google.createEvent).toHaveBeenCalledWith(
      { provider: 'GOOGLE', refreshToken: 'token-10' },
      {
        bookingId: 1,
        title: 'Corte · Ana',
        description:
          'Comentario: Alergia al tinte\nPeluquería · Centro\nTurno en Agendic: https://agendic.test/bookings/1',
        location: 'Calle 1',
        start: new Date('2026-11-05T15:00:00Z'),
        end: new Date('2026-11-05T16:00:00Z'),
        attendeeEmail: 'ana@example.com',
      },
    );
  });

  it('marks a Turno pendiente in the title, and a Servicio personal in the description', async () => {
    const { useCase, google } = setup([
      live({
        status: BookingStatus.PENDING,
        businessName: null,
        branchName: null,
        branchAddress: null,
      }),
    ]);

    await useCase.execute();

    const content = google.createEvent.mock.calls[0][1];
    expect(content.title).toBe('Corte · Ana (pendiente)');
    expect(content.description).toBe(
      'Servicio personal\nTurno en Agendic: https://agendic.test/bookings/1',
    );
    expect(content.location).toBeNull();
  });

  it('writes one event per Turno of a Serie', async () => {
    const { useCase, google } = setup([
      live({ id: 1 }),
      live({ id: 2 }),
      live({ id: 3 }),
    ]);

    await useCase.execute();

    expect(google.createEvent).toHaveBeenCalledTimes(3);
  });

  it('does not touch Google when the Turno has not changed', async () => {
    const { useCase, google } = setup([live()]);
    await useCase.execute();
    google.createEvent.mockClear();

    await useCase.execute();

    expect(google.createEvent).not.toHaveBeenCalled();
    expect(google.updateEvent).not.toHaveBeenCalled();
  });

  it('updates the event, not recreates it, when the Turno is accepted', async () => {
    const booking = live({ status: BookingStatus.PENDING });
    const { useCase, google, calendar } = setup([booking]);
    await useCase.execute();
    booking.status = BookingStatus.BOOKED;

    await useCase.execute();

    expect(google.createEvent).toHaveBeenCalledTimes(1);
    expect(google.updateEvent).toHaveBeenCalledTimes(1);
    expect([...calendar.values()]).toEqual(['Corte · Ana']);
  });

  it('does not recreate an event the User deleted by hand while the Turno has not changed', async () => {
    const { useCase, google, calendar } = setup([live()]);
    await useCase.execute();
    calendar.clear();

    await useCase.execute();

    expect(google.createEvent).toHaveBeenCalledTimes(1);
  });

  it('writes a new event when the User deleted it and the Turno changed since', async () => {
    const booking = live({ status: BookingStatus.PENDING });
    const { useCase, google, calendar, table } = setup([booking]);
    await useCase.execute();
    calendar.clear();
    booking.status = BookingStatus.BOOKED;

    await useCase.execute();

    expect(google.createEvent).toHaveBeenCalledTimes(2);
    expect(table.get(1)?.googleEventId).toBe('evt-2');
  });

  it('moves the event to the Turno that replaced it on Reagendar when the same User attends', async () => {
    const bookings = [live({ id: 1 })];
    const { useCase, google, table, events } = setup(bookings);
    await useCase.execute();
    const eventId = table.get(1)!.googleEventId;
    // Reagendar: the original is now Cancelado and a new Turno carries on from it.
    bookings.splice(
      0,
      1,
      live({
        id: 2,
        fromRescheduleId: 1,
        startsAt: new Date('2026-11-06T15:00:00Z'),
        endsAt: new Date('2026-11-06T16:00:00Z'),
      }),
    );
    events.listOfEndedBookingsOfConnectedUsers.mockImplementation(async () =>
      table.has(1) ? [table.get(1)!] : [],
    );

    await useCase.execute();

    expect(google.updateEvent).toHaveBeenCalledWith(
      { provider: 'GOOGLE', refreshToken: 'token-10' },
      eventId,
      expect.objectContaining({ bookingId: 2 }),
    );
    expect(google.createEvent).toHaveBeenCalledTimes(1);
    expect(google.deleteEvent).not.toHaveBeenCalled();
    expect(table.get(2)?.googleEventId).toBe(eventId);
    expect(table.has(1)).toBe(false);
  });

  it('deletes the event of the previous User and creates one for the new User when Reagendar changes who attends', async () => {
    const previous = stored(1, { userId: 10, googleEventId: 'evt-prev' });
    const { useCase, google, table, calendar } = setup(
      [live({ id: 2, userId: 20, fromRescheduleId: 1 })],
      [previous],
    );
    calendar.set('evt-prev', 'Corte · Ana');

    await useCase.execute();

    expect(google.createEvent).toHaveBeenCalledWith(
      { provider: 'GOOGLE', refreshToken: 'token-20' },
      expect.objectContaining({ bookingId: 2 }),
    );
    expect(google.deleteEvent).toHaveBeenCalledWith(
      { provider: 'GOOGLE', refreshToken: 'token-10' },
      'evt-prev',
    );
    expect(table.has(1)).toBe(false);
    expect(table.get(2)?.userId).toBe(20);
  });

  it('deletes the event of a Cancelado or Rechazado Turno', async () => {
    const { useCase, google, table } = setup([], [stored(5)]);

    await useCase.execute();

    expect(google.deleteEvent).toHaveBeenCalledWith(
      { provider: 'GOOGLE', refreshToken: 'token-10' },
      'old-5',
    );
    expect(table.has(5)).toBe(false);
  });

  it('keeps going and retries on the next pass when Google fails', async () => {
    const { useCase, google, table } = setup([
      live({ id: 1 }),
      live({ id: 2 }),
    ]);
    google.createEvent.mockRejectedValueOnce(new ExternalServiceError('down'));

    await useCase.execute();
    expect(table.has(1)).toBe(false);
    expect(table.has(2)).toBe(true);

    await useCase.execute();
    expect(table.has(1)).toBe(true);
  });

  it('marks the connection DISCONNECTED and stops trying with that User when Google rejects the token', async () => {
    const { useCase, google, connections } = setup([
      live({ id: 1 }),
      live({ id: 2 }),
      live({ id: 3, userId: 20 }),
    ]);
    google.createEvent.mockRejectedValueOnce(
      new CalendarAccessRevokedError('revoked'),
    );

    await useCase.execute();

    expect(connections.markDisconnected).toHaveBeenCalledTimes(1);
    expect(connections.markDisconnected).toHaveBeenCalledWith(10);
    expect(google.createEvent).toHaveBeenCalledTimes(2);
    expect(google.createEvent).toHaveBeenLastCalledWith(
      { provider: 'GOOGLE', refreshToken: 'token-20' },
      expect.anything(),
    );
  });

  it('skips a User without a usable token', async () => {
    const { useCase, google, connections } = setup([live()]);
    connections.findCredentialsByUserId.mockResolvedValue(null);

    await useCase.execute();

    expect(google.createEvent).not.toHaveBeenCalled();
  });
});
