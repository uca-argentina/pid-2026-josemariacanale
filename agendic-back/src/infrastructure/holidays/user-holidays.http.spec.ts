import {
  Availability,
  emptySchedule,
} from '../../domain/availabilities/availability';
import { UpcomingBooking } from '../../domain/bookings/booking';
import { ExternalServiceError, NotConfiguredError } from '../../domain/errors';
import { Holiday } from '../../domain/holidays/holiday';
import { UserHolidaySettings } from '../../domain/holidays/user-holiday-settings';
import {
  ANA,
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
      cancelledBookings: 0,
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
    const { cancelledBookings: _, ...listed } = res.body;
    expect((await get().expect(200)).body).toEqual(listed);
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
    expect(dropped.body).toEqual({
      cancelledBookings: 0,
      countryCode: null,
      holidays: [],
    });
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

  describe('Turnos left outside', () => {
    const REASON =
      'Ana Pérez no atiende por Revolución de Mayo. Podés reservar otro horario.';
    const GENERAL: Availability = {
      id: 1,
      userId: ANA.id,
      name: 'Horas laborables',
      timeZone: 'America/Argentina/Buenos_Aires',
      isDefault: true,
      schedule: emptySchedule().map((_, day) =>
        day >= 1 && day <= 5 ? [{ start: '09:00', end: '17:00' }] : [],
      ),
      overrides: [],
    };
    /** A Turno of Ana's at 15:00 in Buenos Aires on `date`, inside GENERAL when it is a weekday. */
    const turno = (id: number, date: string): UpcomingBooking => {
      const startsAt = new Date(`${date}T18:00:00.000Z`);
      return {
        id,
        startsAt,
        prepStartsAt: startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60_000),
        clientName: `Cliente ${id}`,
        clientEmail: `cliente${id}@example.com`,
        availabilityId: GENERAL.id,
        timeZone: GENERAL.timeZone,
        clientTimeZone: GENERAL.timeZone,
        serviceName: 'Corte',
        link: `link-${id}`,
        business: null,
        branch: null,
      };
    };
    const MAY25 = turno(7, '2026-05-25');
    const preview = (path: string, body: object) =>
      t.http
        .post(`/users/me/holidays${path}`)
        .set(bearer(CLERK_TOKEN))
        .send(body);

    beforeEach(() => {
      t.users.findById.mockResolvedValue(ANA);
      t.availabilities.findById.mockResolvedValue(GENERAL);
      t.outOfOffice.listByUserEndingFrom.mockResolvedValue([]);
      t.bookings.listUpcomingByUser.mockResolvedValue([MAY25]);
      t.userHolidaySettings.saveCancelling.mockImplementation(
        async (_, settings, cancellations) => {
          saved = settings;
          return cancellations.map(({ id }) => id);
        },
      );
    });

    describe('POST /users/me/holidays/preview', () => {
      it('answers the Turnos on the holidays of the chosen country, with the holiday name, and writes nothing', async () => {
        const res = await preview('/preview', { countryCode: 'AR' }).expect(200);

        expect(res.body).toEqual([
          {
            id: 7,
            startsAt: '2026-05-25T18:00:00.000Z',
            endsAt: '2026-05-25T18:30:00.000Z',
            timeZone: GENERAL.timeZone,
            serviceName: 'Corte',
            clientName: 'Cliente 7',
            business: null,
            branch: null,
            cancellationCause: 'PUBLIC_HOLIDAY',
            cancellationReason: REASON,
          },
        ]);
        expect(t.userHolidaySettings.save).not.toHaveBeenCalled();
        expect(t.userHolidaySettings.saveCancelling).not.toHaveBeenCalled();
      });

      it('answers nothing for a Turno on a day the Usuario does not work', async () => {
        t.availabilities.findById.mockResolvedValue({
          ...GENERAL,
          schedule: emptySchedule(),
        });

        const res = await preview('/preview', { countryCode: 'AR' }).expect(200);

        expect(res.body).toEqual([]);
      });

      it('answers nothing for null, without asking Google', async () => {
        const res = await preview('/preview', { countryCode: null }).expect(200);

        expect(res.body).toEqual([]);
        expect(t.googleCalendar.fetchHolidays).not.toHaveBeenCalled();
        expect(t.holidays.listByCountryCodeAndYear).not.toHaveBeenCalled();
      });

      it('reads the holidays of every year the Turnos span, the middle one too', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([
          turno(7, '2026-03-03'),
          turno(8, '2027-06-15'),
          turno(9, '2028-03-07'),
        ]);
        t.holidays.listByCountryCodeAndYear.mockImplementation(async (c, y) =>
          y === 2027 ? [holiday('mid', 'Feriado del medio', '2027-06-15', c)] : [],
        );

        const res = await preview('/preview', { countryCode: 'AR' }).expect(200);

        expect(res.body.map(({ id }: { id: number }) => id)).toEqual([8]);
        expect(res.body[0].cancellationReason).toContain('Feriado del medio');
      });

      it('propagates a Google failure while computing the schedule after', async () => {
        t.holidays.listByCountryCodeAndYear.mockResolvedValue([]);
        t.holidays.findLatestUpdatedAt.mockResolvedValue(null);
        t.googleCalendar.fetchHolidays.mockRejectedValue(
          new ExternalServiceError('Google Calendar failed'),
        );

        await preview('/preview', { countryCode: 'AR' }).expect(502);
      });

      it('answers 400 for an unknown country and for a body without one', async () => {
        const unknown = await preview('/preview', { countryCode: 'ZZ' }).expect(400);
        await preview('/preview', {}).expect(400);

        expect(unknown.body.message).toBe('Unknown holiday country ZZ');
      });
    });

    describe('POST /users/me/holidays/:holidayId/preview', () => {
      beforeEach(() => {
        saved = { countryCode: 'AR', disabledIds: ['may25'] };
      });

      it('answers the Turnos of the day a switched-off holiday takes when it is switched on', async () => {
        const res = await preview('/may25/preview', { enabled: true }).expect(200);

        expect(res.body.map(({ id }: { id: number }) => id)).toEqual([7]);
        expect(res.body[0].cancellationCause).toBe('PUBLIC_HOLIDAY');
        expect(res.body[0].cancellationReason).toBe(REASON);
        expect(t.bookings.listUpcomingByUser).toHaveBeenCalledWith(
          ANA.id,
          expect.any(Date),
          new Date('2026-05-27T00:00:00.000Z'),
        );
        expect(t.userHolidaySettings.save).not.toHaveBeenCalled();
      });

      it('answers nothing for enabled false, and 404 for an unknown id', async () => {
        const off = await preview('/may25/preview', { enabled: false }).expect(200);
        const missing = await preview('/nope/preview', { enabled: true }).expect(404);

        expect(off.body).toEqual([]);
        expect(missing.body.message).toBe('Holiday nope not found');
      });
    });

    describe('PUT /users/me/holidays', () => {
      const put = (body: object) =>
        t.http.put('/users/me/holidays').set(bearer(CLERK_TOKEN)).send(body);

      it('cancels the confirmed Turnos in the same write as the country, and notifies the Cliente with the Causa', async () => {
        const res = await put({ countryCode: 'AR', cancelBookingIds: [7] }).expect(200);

        expect(res.body.cancelledBookings).toBe(1);
        expect(res.body.countryCode).toBe('AR');
        expect(t.userHolidaySettings.saveCancelling).toHaveBeenCalledWith(
          ANA.id,
          { countryCode: 'AR', disabledIds: [] },
          [{ id: 7, cause: 'PUBLIC_HOLIDAY', reason: REASON }],
          t.clock.now(),
        );
        expect(t.userHolidaySettings.save).not.toHaveBeenCalled();
        expect(t.mailer.sendBookingCancellationWithCause).toHaveBeenCalledWith(
          'cliente7@example.com',
          [expect.objectContaining({ link: 'link-7', reason: REASON })],
        );
      });

      it('answers 409 and writes nothing when a Turno left outside is not confirmed', async () => {
        const res = await put({ countryCode: 'AR', cancelBookingIds: [] }).expect(409);

        expect(res.body.message).toBe(
          'Los Turnos que quedan fuera de tu horario cambiaron',
        );
        expect(t.userHolidaySettings.save).not.toHaveBeenCalled();
        expect(t.userHolidaySettings.saveCancelling).not.toHaveBeenCalled();
        expect(t.mailer.sendBookingCancellationWithCause).not.toHaveBeenCalled();
      });

      it('saves null straight away, cancelling nothing and without asking Google', async () => {
        const res = await put({ countryCode: null }).expect(200);

        expect(res.body.cancelledBookings).toBe(0);
        expect(t.userHolidaySettings.save).toHaveBeenCalledWith(ANA.id, {
          countryCode: null,
          disabledIds: [],
        });
        expect(t.googleCalendar.fetchHolidays).not.toHaveBeenCalled();
      });
    });

    describe('PATCH /users/me/holidays/:holidayId', () => {
      const patchHoliday = (body: object) =>
        t.http
          .patch('/users/me/holidays/may25')
          .set(bearer(CLERK_TOKEN))
          .send(body);

      beforeEach(() => {
        saved = { countryCode: 'AR', disabledIds: ['may25'] };
      });

      it('cancels the confirmed Turnos of the day it switches on', async () => {
        const res = await patchHoliday({
          enabled: true,
          cancelBookingIds: [7],
        }).expect(200);

        expect(res.body.cancelledBookings).toBe(1);
        expect(t.userHolidaySettings.saveCancelling).toHaveBeenCalledWith(
          ANA.id,
          { countryCode: 'AR', disabledIds: [] },
          [{ id: 7, cause: 'PUBLIC_HOLIDAY', reason: REASON }],
          t.clock.now(),
        );
        expect(t.mailer.sendBookingCancellationWithCause).toHaveBeenCalledTimes(1);
      });

      it('answers 409 and leaves the settings as they were when a Turno is not confirmed', async () => {
        await patchHoliday({ enabled: true }).expect(409);

        expect(saved).toEqual({ countryCode: 'AR', disabledIds: ['may25'] });
        expect(t.userHolidaySettings.saveCancelling).not.toHaveBeenCalled();
      });

      it('switches off without cancelling anything', async () => {
        saved = { countryCode: 'AR', disabledIds: [] };

        const res = await patchHoliday({ enabled: false }).expect(200);

        expect(res.body.cancelledBookings).toBe(0);
        expect(t.userHolidaySettings.saveCancelling).not.toHaveBeenCalled();
        expect(t.bookings.listUpcomingByUser).not.toHaveBeenCalled();
      });
    });
  });

  it.each([
    ['GET', '/users/me/holidays', undefined],
    ['PUT', '/users/me/holidays', { countryCode: 'AR' }],
    ['PATCH', '/users/me/holidays/may25', { enabled: false }],
    ['GET', '/users/me/holidays/conflicts', undefined],
    ['POST', '/users/me/holidays/preview', { countryCode: 'AR' }],
    ['POST', '/users/me/holidays/may25/preview', { enabled: true }],
  ] as const)('answers 503 on %s %s without GOOGLE_CALENDAR_API_KEY', async (method, path, body) => {
    t.googleCalendar.assertConfigured.mockImplementation(() => {
      throw new NotConfiguredError('Días festivos no configurados');
    });

    const res = await t.http[
      method.toLowerCase() as 'get' | 'put' | 'patch' | 'post'
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
    ['post', '/users/me/holidays/preview'],
    ['post', '/users/me/holidays/may25/preview'],
  ] as const)('needs a Sesión on %s %s', async (method, path) => {
    await t.http[method](path).expect(401);
  });
});
