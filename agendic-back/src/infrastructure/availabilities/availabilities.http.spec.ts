import {
  Availability,
  emptySchedule,
} from '../../domain/availabilities/availability';
import {
  ANA,
  bearer,
  CLERK_TOKEN,
  createTestApp,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  TestApp,
  workWeek,
} from '../../test-app';

const GENERAL: Availability = {
  id: 1,
  userId: ANA.id,
  name: 'Horas laborables',
  timeZone: 'America/Argentina/Buenos_Aires',
  isDefault: true,
  schedule: workWeek('09:00', '17:00'),
  overrides: [{ date: '2026-01-05', ranges: [] }],
};

const AFTERNOON: Availability = {
  id: 2,
  userId: ANA.id,
  name: 'Turno tarde',
  timeZone: 'Europe/Madrid',
  isDefault: false,
  schedule: emptySchedule(),
  overrides: [],
};

/** Another Usuario's: Ana must not see it. */
const BRUNOS: Availability = { ...GENERAL, id: 3, userId: 2 };

const BODY = {
  name: 'Horas laborables',
  timeZone: 'America/Argentina/Buenos_Aires',
  schedule: workWeek('09:00', '17:00'),
  overrides: [{ date: '2026-01-05', ranges: [] }],
};

describe('Availability', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    scriptOtherSession(t);
    t.availabilities.findById.mockImplementation(
      async (id) => [GENERAL, AFTERNOON, BRUNOS].find((a) => a.id === id) ?? null,
    );
  });
  afterEach(() => t.app.close());

  describe('GET /availabilities', () => {
    it('lists the Usuario Availabilities without their Franjas, the default marked', async () => {
      t.availabilities.listByUser.mockResolvedValue([GENERAL, AFTERNOON]);

      const res = await t.http
        .get('/availabilities')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual([
        {
          id: 1,
          name: 'Horas laborables',
          isDefault: true,
          timeZone: 'America/Argentina/Buenos_Aires',
        },
        {
          id: 2,
          name: 'Turno tarde',
          isDefault: false,
          timeZone: 'Europe/Madrid',
        },
      ]);
      expect(t.availabilities.listByUser).toHaveBeenCalledWith(ANA.id);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.get('/availabilities').expect(401);
    });
  });

  describe('GET /availabilities/:id', () => {
    it('answers the matrix of 7 days, Sunday first, and the Anulaciones by date', async () => {
      const res = await t.http
        .get('/availabilities/1')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual({
        id: 1,
        name: 'Horas laborables',
        isDefault: true,
        timeZone: 'America/Argentina/Buenos_Aires',
        schedule: workWeek('09:00', '17:00'),
        overrides: [{ date: '2026-01-05', ranges: [] }],
      });
      expect(res.body.schedule).toHaveLength(7);
      expect(res.body.schedule[0]).toEqual([]);
    });

    it("answers 404 for another Usuario's Availability", async () => {
      await t.http
        .get('/availabilities/3')
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });

    it('answers 404 for an unknown Availability', async () => {
      await t.http
        .get('/availabilities/999')
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.get('/availabilities/1').expect(401);
    });
  });

  describe('POST /availabilities', () => {
    beforeEach(() => {
      t.availabilities.create.mockImplementation(async (data) => ({
        id: 4,
        isDefault: false,
        schedule: emptySchedule(),
        overrides: [],
        ...data,
      }));
    });

    it('creates an empty Availability of the Usuario, not the default', async () => {
      const res = await t.http
        .post('/availabilities')
        .set(bearer(CLERK_TOKEN))
        .send({ name: 'Verano', timeZone: 'America/Montevideo' })
        .expect(201);

      expect(res.body).toEqual({
        id: 4,
        name: 'Verano',
        isDefault: false,
        timeZone: 'America/Montevideo',
        schedule: emptySchedule(),
        overrides: [],
      });
      expect(t.availabilities.create).toHaveBeenCalledWith({
        userId: ANA.id,
        name: 'Verano',
        timeZone: 'America/Montevideo',
      });
    });

    it('answers 422 for a time zone that is not IANA, creating nothing', async () => {
      await t.http
        .post('/availabilities')
        .set(bearer(CLERK_TOKEN))
        .send({ name: 'Verano', timeZone: '-03:00' })
        .expect(422);

      expect(t.availabilities.create).not.toHaveBeenCalled();
    });

    it('rejects a missing name with 400', async () => {
      await t.http
        .post('/availabilities')
        .set(bearer(CLERK_TOKEN))
        .send({ timeZone: 'America/Montevideo' })
        .expect(400);
    });
  });

  describe('PUT /availabilities/:id', () => {
    const put = (body: object, id = 1, token = CLERK_TOKEN) =>
      t.http.put(`/availabilities/${id}`).set(bearer(token)).send(body);

    beforeEach(() => {
      t.availabilities.replace.mockImplementation(async (id, data) => ({
        ...GENERAL,
        id,
        ...data,
      }));
    });

    it('replaces the whole Availability and answers it', async () => {
      const schedule = workWeek('09:00', '17:00');
      schedule[3] = [{ start: '10:00', end: '14:00' }];
      const body = { ...BODY, schedule };

      const res = await put(body).expect(200);

      expect(res.body).toEqual({ id: 1, isDefault: true, ...body });
      expect(t.availabilities.replace).toHaveBeenCalledWith(1, body);
    });

    it('accepts the isDefault it was read with, and ignores it', async () => {
      await put({ ...BODY, isDefault: false }).expect(200);

      expect(t.availabilities.replace).toHaveBeenCalledWith(1, BODY);
    });

    it('lets two ranges of a day touch', async () => {
      const schedule = emptySchedule();
      schedule[1] = [
        { start: '09:00', end: '13:00' },
        { start: '13:00', end: '17:00' },
      ];

      await put({ ...BODY, schedule }).expect(200);
    });

    it.each([
      ['a range that ends before it starts', [{ start: '17:00', end: '09:00' }]],
      ['a range that ends when it starts', [{ start: '09:00', end: '09:00' }]],
    ])('answers 422 for %s, naming the day', async (_, ranges) => {
      const schedule = emptySchedule();
      schedule[3] = ranges;

      const res = await put({ ...BODY, schedule }).expect(422);

      expect(res.body.message).toContain('miércoles');
      expect(t.availabilities.replace).not.toHaveBeenCalled();
    });

    it('answers 422 for two overlapping ranges of a day, naming the day', async () => {
      const schedule = emptySchedule();
      schedule[5] = [
        { start: '09:00', end: '13:00' },
        { start: '12:00', end: '17:00' },
      ];

      const res = await put({ ...BODY, schedule }).expect(422);

      expect(res.body.message).toContain('viernes');
    });

    it('answers 422 for a bad range in an Anulación, naming its date', async () => {
      const res = await put({
        ...BODY,
        overrides: [
          { date: '2026-02-10', ranges: [{ start: '12:00', end: '11:00' }] },
        ],
      }).expect(422);

      expect(res.body.message).toContain('2026-02-10');
    });

    it('answers 422 for two Anulaciones of the same date', async () => {
      const res = await put({
        ...BODY,
        overrides: [
          { date: '2026-02-10', ranges: [] },
          { date: '2026-02-10', ranges: [{ start: '09:00', end: '10:00' }] },
        ],
      }).expect(422);

      expect(res.body.message).toContain('2026-02-10');
    });

    it('answers 422 for a time zone that is not IANA', async () => {
      await put({ ...BODY, timeZone: 'Buenos Aires' }).expect(422);

      expect(t.availabilities.replace).not.toHaveBeenCalled();
    });

    it('rejects a schedule that is not 7 days with 400', async () => {
      await put({ ...BODY, schedule: [[], []] }).expect(400);
    });

    it('rejects a malformed time with 400', async () => {
      const schedule = emptySchedule();
      schedule[1] = [{ start: '9am', end: '17:00' }];

      await put({ ...BODY, schedule }).expect(400);
    });

    it("answers 404 for another Usuario's Availability, replacing nothing", async () => {
      await put(BODY, 3).expect(404);

      expect(t.availabilities.replace).not.toHaveBeenCalled();
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.put('/availabilities/1').send(BODY).expect(401);
    });
  });

  describe('PATCH /availabilities/:id/default', () => {
    it('marks it the default', async () => {
      t.availabilities.makeDefault.mockResolvedValue({
        ...AFTERNOON,
        isDefault: true,
      });

      const res = await t.http
        .patch('/availabilities/2/default')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body.isDefault).toBe(true);
      expect(t.availabilities.makeDefault).toHaveBeenCalledWith(2);
    });

    it("answers 404 for another Usuario's Availability", async () => {
      await t.http
        .patch('/availabilities/3/default')
        .set(bearer(CLERK_TOKEN))
        .expect(404);

      expect(t.availabilities.makeDefault).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /availabilities/:id', () => {
    it('deletes one no Servicio uses', async () => {
      t.availabilities.countServices.mockResolvedValue(0);

      await t.http
        .delete('/availabilities/2')
        .set(bearer(CLERK_TOKEN))
        .expect(204);

      expect(t.availabilities.delete).toHaveBeenCalledWith(2);
    });

    it('answers 422 for the default, deleting nothing', async () => {
      await t.http
        .delete('/availabilities/1')
        .set(bearer(CLERK_TOKEN))
        .expect(422);

      expect(t.availabilities.delete).not.toHaveBeenCalled();
    });

    it('answers 422 when a Servicio is attended with it, saying how many', async () => {
      t.availabilities.countServices.mockResolvedValue(2);

      const res = await t.http
        .delete('/availabilities/2')
        .set(bearer(CLERK_TOKEN))
        .expect(422);

      expect(res.body.message).toContain('la usan 2 Servicios');
      expect(t.availabilities.delete).not.toHaveBeenCalled();
    });

    it("answers 404 for another Usuario's Availability", async () => {
      await t.http
        .delete('/availabilities/2')
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(404);

      expect(t.availabilities.delete).not.toHaveBeenCalled();
    });
  });
});
