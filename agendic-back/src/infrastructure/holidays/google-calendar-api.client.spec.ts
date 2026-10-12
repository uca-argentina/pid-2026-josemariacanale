import { NotConfiguredError } from '../../domain/errors';
import { GoogleCalendarApiClient } from './google-calendar-api.client';

describe('GoogleCalendarApiClient', () => {
  const client = new GoogleCalendarApiClient();
  const key = process.env.GOOGLE_CALENDAR_API_KEY;

  afterEach(() => {
    if (key === undefined) delete process.env.GOOGLE_CALENDAR_API_KEY;
    else process.env.GOOGLE_CALENDAR_API_KEY = key;
  });

  it('says it is not configured without the key, instead of reaching Google', async () => {
    delete process.env.GOOGLE_CALENDAR_API_KEY;

    expect(() => client.assertConfigured()).toThrow(NotConfiguredError);
    await expect(client.fetchHolidays('AR', 2026)).rejects.toThrow(
      'Días festivos no configurados',
    );
  });
});
