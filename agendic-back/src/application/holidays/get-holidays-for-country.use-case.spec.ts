import { ExternalServiceError } from '../../domain/errors';
import { Holiday } from '../../domain/holidays/holiday';
import { GetHolidaysForCountryUseCase } from './get-holidays-for-country.use-case';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-01T12:00:00.000Z');
const NAVIDAD: Holiday = {
  countryCode: 'AR',
  calendarId: 'es.ar.official#holiday@group.v.calendar.google.com',
  eventId: 'navidad',
  name: 'Navidad',
  date: new Date('2026-12-25T00:00:00.000Z'),
  year: 2026,
};

describe('GetHolidaysForCountryUseCase', () => {
  const holidays = {
    findLatestUpdatedAt: jest.fn(),
    listByCountryCodeAndYear: jest.fn(),
    replaceByCountryCodeAndYear: jest.fn(),
  };
  const google = { assertConfigured: jest.fn(), fetchHolidays: jest.fn() };
  const useCase = new GetHolidaysForCountryUseCase(holidays, google, {
    now: () => NOW,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    holidays.listByCountryCodeAndYear.mockResolvedValue([NAVIDAD]);
    google.fetchHolidays.mockResolvedValue([NAVIDAD]);
  });

  it('asks Google and caches when the country and year were never cached', async () => {
    holidays.findLatestUpdatedAt.mockResolvedValue(null);

    await expect(useCase.execute('AR', 2026)).resolves.toEqual([NAVIDAD]);

    expect(google.fetchHolidays).toHaveBeenCalledWith('AR', 2026);
    expect(holidays.replaceByCountryCodeAndYear).toHaveBeenCalledWith('AR', 2026, [NAVIDAD]);
  });

  it('asks Google when the cache is more than 7 days old', async () => {
    holidays.findLatestUpdatedAt.mockResolvedValue(new Date(NOW.getTime() - 7 * DAY_MS - 1));

    await useCase.execute('AR', 2026);

    expect(google.fetchHolidays).toHaveBeenCalledTimes(1);
  });

  it('does not ask Google when the cache is 7 days old or less', async () => {
    holidays.findLatestUpdatedAt.mockResolvedValue(new Date(NOW.getTime() - 7 * DAY_MS));

    await expect(useCase.execute('AR', 2026)).resolves.toEqual([NAVIDAD]);

    expect(google.fetchHolidays).not.toHaveBeenCalled();
    expect(holidays.replaceByCountryCodeAndYear).not.toHaveBeenCalled();
  });

  it('keeps the old cache when Google fails', async () => {
    holidays.findLatestUpdatedAt.mockResolvedValue(null);
    google.fetchHolidays.mockRejectedValue(new ExternalServiceError('boom'));

    await expect(useCase.execute('AR', 2026)).rejects.toThrow(ExternalServiceError);

    expect(holidays.replaceByCountryCodeAndYear).not.toHaveBeenCalled();
  });
});
