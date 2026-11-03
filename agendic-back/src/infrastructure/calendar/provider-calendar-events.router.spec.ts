import { ProviderCalendarEventsRouter } from './provider-calendar-events.router';

const content = {
  bookingId: 1,
  title: 't',
  description: 'd',
  location: null,
  start: new Date('2026-01-02T15:00:00.000Z'),
  end: new Date('2026-01-02T16:00:00.000Z'),
  attendeeEmail: 'ana@example.com',
};

const clientMock = () => ({
  listCalendars: jest.fn().mockResolvedValue([]),
  listBusy: jest.fn().mockResolvedValue([]),
  createEvent: jest.fn().mockResolvedValue('evt'),
  updateEvent: jest.fn().mockResolvedValue(true),
  deleteEvent: jest.fn().mockResolvedValue(undefined),
});

describe('ProviderCalendarEventsRouter', () => {
  const google = clientMock();
  const microsoft = clientMock();
  const router = new ProviderCalendarEventsRouter(
    google as never,
    microsoft as never,
  );

  it('talks to Google with a Google connection, passing only the refresh token', async () => {
    const credentials = { provider: 'GOOGLE' as const, refreshToken: 'g' };

    await router.createEvent(credentials, content);
    await router.deleteEvent(credentials, 'evt');

    expect(google.createEvent).toHaveBeenCalledWith('g', content);
    expect(google.deleteEvent).toHaveBeenCalledWith('g', 'evt');
    expect(microsoft.createEvent).not.toHaveBeenCalled();
  });

  it('talks to Microsoft with a Microsoft connection', async () => {
    const credentials = { provider: 'MICROSOFT' as const, refreshToken: 'm' };
    const from = new Date('2026-01-02T00:00:00.000Z');
    const to = new Date('2026-01-03T00:00:00.000Z');

    await router.listCalendars(credentials);
    await router.listBusy(credentials, ['primary'], from, to);
    await router.updateEvent(credentials, 'evt', content);

    expect(microsoft.listCalendars).toHaveBeenCalledWith('m');
    expect(microsoft.listBusy).toHaveBeenCalledWith('m', ['primary'], from, to);
    expect(microsoft.updateEvent).toHaveBeenCalledWith('m', 'evt', content);
    expect(google.listCalendars).not.toHaveBeenCalled();
  });
});
