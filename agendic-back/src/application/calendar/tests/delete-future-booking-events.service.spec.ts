import { BookingCalendarEventsRepository } from '../../../domain/calendar/booking-calendar-events.repository';
import { CalendarEvents } from '../../../domain/calendar/calendar-events';
import { ExternalServiceError } from '../../../domain/errors';
import { DeleteFutureBookingEventsService } from '../delete-future-booking-events.service';

const CREDENTIALS = { provider: 'MICROSOFT' as const, refreshToken: 'token' };
const NOW = new Date('2026-11-03T12:00:00Z');

const setup = () => {
  const events = {
    listFutureByUserId: jest.fn().mockResolvedValue([
      { bookingId: 1, userId: 10, googleEventId: 'a', fingerprint: 'x' },
      { bookingId: 2, userId: 10, googleEventId: 'b', fingerprint: 'x' },
    ]),
    deleteByUserId: jest.fn(),
  } as unknown as jest.Mocked<BookingCalendarEventsRepository>;
  const google = {
    deleteEvent: jest.fn(),
  } as unknown as jest.Mocked<CalendarEvents>;
  const service = new DeleteFutureBookingEventsService(events, google, {
    now: () => NOW,
  });
  return { service, events, google };
};

describe('DeleteFutureBookingEventsService', () => {
  it('deletes the events of the future Turnos and forgets every row of the User', async () => {
    const { service, events, google } = setup();

    await service.execute(10, CREDENTIALS);

    expect(events.listFutureByUserId).toHaveBeenCalledWith(10, NOW);
    expect(google.deleteEvent).toHaveBeenCalledWith(CREDENTIALS, 'a');
    expect(google.deleteEvent).toHaveBeenCalledWith(CREDENTIALS, 'b');
    expect(events.deleteByUserId).toHaveBeenCalledWith(10);
  });

  it('keeps going when the provider fails on one event', async () => {
    const { service, events, google } = setup();
    google.deleteEvent.mockRejectedValueOnce(new ExternalServiceError('down'));

    await service.execute(10, CREDENTIALS);

    expect(google.deleteEvent).toHaveBeenCalledTimes(2);
    expect(events.deleteByUserId).toHaveBeenCalledWith(10);
  });

  it('only forgets the rows without credentials', async () => {
    const { service, events, google } = setup();

    await service.execute(10, null);

    expect(google.deleteEvent).not.toHaveBeenCalled();
    expect(events.deleteByUserId).toHaveBeenCalledWith(10);
  });
});
