import { NotConfiguredError } from '../../domain/errors';
import { Holiday } from '../../domain/holidays/holiday';
import { UserHolidaySettings } from '../../domain/holidays/user-holiday-settings';
import {
  bearer,
  CLERK_TOKEN,
  createTestApp,
  scriptSession,
  TestApp,
} from '../../test-app';

const holiday = (
  eventId: string,
  name: string,
  date: string,
  countryCode = 'AR',
): Holiday => ({
  countryCode,
  calendarId: `es.${countryCode}`,
  eventId,
  name,
  date: new Date(`${date}T00:00:00.000Z`),
  year: Number(date.slice(0, 4)),
});

/** The test clock reads 2026-01-01, so `past` is already over and the rest are still to come. */
const AR_HOLIDAYS = [
  holiday('past', 'Año Nuevo anterior', '2025-12-25'),
  holiday('may25', 'Revolución de Mayo', '2026-05-25'),
  holiday('jul9', 'Día de la Independencia', '2026-07-09'),
  holiday('jan1', 'Año Nuevo', '2026-01-01'),
  holiday('next', 'Año Nuevo siguiente', '2027-01-01'),
];

describe('/users/me/holidays', () => {
  let t: TestApp;
  let saved: UserHolidaySettings | null;

  const calendar = (code: string, year: number) =>
    code === 'AR'
      ? AR_HOLIDAYS.filter((h) => h.year === year).sort(
          (a, b) => a.date.getTime() - b.date.getTime(),
        )
      : [holiday('chr1', 'Navidad', `${year}-12-25`, code)];

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    saved = null;
    t.holidays.findLatestUpdatedAt.mockImplementation(async () =>
      t.clock.now(),
    );
    t.holidays.listByCountryCodeAndYear.mockImplementation(async (c, y) =>
      calendar(c, y),
    );
    t.userHolidaySettings.findByUserId.mockImplementation(async () => saved);
    t.userHolidaySettings.save.mockImplementation(async (_, settings) => {
      saved = settings;
    });
    t.bookings.listUpcomingByUser.mockResolvedValue([]);
  });
  afterEach(() => t.app.close());

  const get = (path = '') =>
    t.http.get(`/users/me/holidays${path}`).set(bearer(CLERK_TOKEN));
  const put = (body: object) =>
    t.http.put('/users/me/holidays').set(bearer(CLERK_TOKEN)).send(body);
  const patch = (id: string, body: object) =>
    t.http
      .patch(`/users/me/holidays/${id}`)
      .set(bearer(CLERK_TOKEN))
      .send(body);

  it('answers no country and no holidays before the Usuario chose one', async () => {
    const res = await get().expect(200);

    expect(res.body).toEqual({ countryCode: null, holidays: [] });
  });

  it('answers the upcoming holidays of the chosen country, by date, from today on', async () => {
    const res = await put({ countryCode: 'AR' }).expect(200);

    expect(res.body).toEqual({
      countryCode: 'AR',
      holidays: [
        { id: 'jan1', name: 'Año Nuevo', date: '2026-01-01', enabled: true },
        {
          id: 'may25',
          name: 'Revolución de Mayo',
          date: '2026-05-25',
          enabled: true,
        },
        {
          id: 'jul9',
          name: 'Día de la Independencia',
          date: '2026-07-09',
          enabled: true,
        },
        {
          id: 'next',
          name: 'Año Nuevo siguiente',
          date: '2027-01-01',
          enabled: true,
        },
      ],
    });
    expect((await get().expect(200)).body).toEqual(res.body);
  });

  it('empties the switched-off holidays when the country changes, and drops the country with null', async () => {
    await put({ countryCode: 'AR' }).expect(200);
    await patch('may25', { enabled: false }).expect(200);
    expect(saved?.disabledIds).toEqual(['may25']);

    const changed = await put({ countryCode: 'CHRISTIAN' }).expect(200);
    expect(saved).toEqual({ countryCode: 'CHRISTIAN', disabledIds: [] });
    expect(changed.body.holidays.every((h: { enabled: boolean }) => h.enabled)).toBe(
      true,
    );

    const dropped = await put({ countryCode: null }).expect(200);
    expect(dropped.body).toEqual({ countryCode: null, holidays: [] });
    expect(saved).toEqual({ countryCode: null, disabledIds: [] });
  });

  it('switches a holiday off and on again', async () => {
    await put({ countryCode: 'AR' }).expect(200);

    const off = await patch('may25', { enabled: false }).expect(200);
    expect(
      off.body.holidays.find((h: { id: string }) => h.id === 'may25').enabled,
    ).toBe(false);

    const on = await patch('may25', { enabled: true }).expect(200);
    expect(
      on.body.holidays.find((h: { id: string }) => h.id === 'may25').enabled,
    ).toBe(true);
    expect(saved?.disabledIds).toEqual([]);
  });

  it('answers 404 for an id that is not in the calendar of this year or the next', async () => {
    await put({ countryCode: 'AR' }).expect(200);

    const res = await patch('nope', { enabled: false }).expect(404);

    expect(res.body).toEqual({
      statusCode: 404,
      message: 'Holiday nope not found',
    });
  });

  it('answers 404 for a toggle without a country', async () => {
    await patch('may25', { enabled: false }).expect(404);
  });

  it('answers 400 for a country that is not in GET /holidays/countries', async () => {
    await put({ countryCode: 'XX' }).expect(400);
    await put({}).expect(400);
    expect(t.userHolidaySettings.save).not.toHaveBeenCalled();
  });

  it('answers 400 for a toggle without a boolean', async () => {
    await put({ countryCode: 'AR' }).expect(200);

    await patch('may25', { enabled: 'no' }).expect(400);
  });

  describe('GET /users/me/holidays/conflicts', () => {
    const turno = (id: number, startsAt: string, timeZone: string) => ({
      id,
      startsAt: new Date(startsAt),
      prepStartsAt: new Date(startsAt),
      endsAt: new Date(startsAt),
      clientName: `Cliente ${id}`,
      clientEmail: `cliente${id}@example.com`,
      availabilityId: 1,
      timeZone,
      clientTimeZone: timeZone,
      serviceName: 'Servicio',
      link: `link-${id}`,
      business: null,
      branch: null,
    });

    it('answers [] without a country', async () => {
      const res = await get('/conflicts').expect(200);

      expect(res.body).toEqual([]);
    });

    it('lists the Turnos on a switched-on holiday, reading the day in the zone of their Availability, and none once it is off', async () => {
      await put({ countryCode: 'AR' }).expect(200);
      t.bookings.listUpcomingByUser.mockResolvedValue([
        turno(1, '2026-05-25T15:00:00.000Z', 'America/Argentina/Buenos_Aires'),
        // 22:00 on the 25th in Buenos Aires, already the 26th in UTC.
        turno(2, '2026-05-26T01:00:00.000Z', 'America/Argentina/Buenos_Aires'),
        // The 26th in Tokyo.
        turno(3, '2026-05-25T20:00:00.000Z', 'Asia/Tokyo'),
        turno(4, '2026-06-01T15:00:00.000Z', 'America/Argentina/Buenos_Aires'),
      ]);

      const res = await get('/conflicts').expect(200);

      expect(res.body).toEqual([
        {
          holidayId: 'may25',
          holidayName: 'Revolución de Mayo',
          date: '2026-05-25',
          bookings: [
            {
              id: 1,
              startsAt: '2026-05-25T15:00:00.000Z',
              clientName: 'Cliente 1',
            },
            {
              id: 2,
              startsAt: '2026-05-26T01:00:00.000Z',
              clientName: 'Cliente 2',
            },
          ],
        },
      ]);
      expect(t.bookings.listUpcomingByUser).toHaveBeenCalledWith(
        1,
        t.clock.now(),
      );

      await patch('may25', { enabled: false }).expect(200);
      expect((await get('/conflicts').expect(200)).body).toEqual([]);
    });
  });

  it.each([
    ['GET', '/users/me/holidays', undefined],
    ['PUT', '/users/me/holidays', { countryCode: 'AR' }],
    ['PATCH', '/users/me/holidays/may25', { enabled: false }],
    ['GET', '/users/me/holidays/conflicts', undefined],
  ] as const)('answers 503 on %s %s without GOOGLE_CALENDAR_API_KEY', async (method, path, body) => {
    t.googleCalendar.assertConfigured.mockImplementation(() => {
      throw new NotConfiguredError('Días festivos no configurados');
    });

    const res = await t.http[
      method.toLowerCase() as 'get' | 'put' | 'patch'
    ](path)
      .set(bearer(CLERK_TOKEN))
      .send(body)
      .expect(503);

    expect(res.body).toEqual({
      statusCode: 503,
      message: 'Días festivos no configurados',
    });
  });

  it.each([
    ['get', '/users/me/holidays'],
    ['put', '/users/me/holidays'],
    ['patch', '/users/me/holidays/may25'],
    ['get', '/users/me/holidays/conflicts'],
  ] as const)('needs a Sesión on %s %s', async (method, path) => {
    await t.http[method](path).expect(401);
  });
});
