import { Availability } from '../../domain/availabilities/availability';
import {
  OutOfOffice,
  OutOfOfficeReason,
} from '../../domain/out-of-office/out-of-office';
import {
  ANA,
  bearer,
  BRUNO,
  CLERK_TOKEN,
  createTestApp,
  DAY_MS,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  TestApp,
  workWeek,
} from '../../test-app';

const DEFAULT_AVAILABILITY: Availability = {
  id: 1,
  userId: ANA.id,
  name: 'Horas laborables',
  timeZone: 'America/Argentina/Buenos_Aires',
  isDefault: true,
  schedule: workWeek('09:00', '17:00'),
  overrides: [],
};

const PERIOD: OutOfOffice = {
  id: 5,
  userId: ANA.id,
  startDate: '2026-02-02',
  endDate: '2026-02-06',
  reason: OutOfOfficeReason.VACATION,
  notes: 'Playa',
  showNotePublicly: true,
};

/** Another Usuario's: Ana must not see it. */
const BRUNOS: OutOfOffice = { ...PERIOD, id: 6, userId: BRUNO.id };

const BODY = {
  startDate: '2026-02-02',
  endDate: '2026-02-06',
  reason: 'VACATION',
  notes: 'Playa',
  showNotePublicly: true,
};

const PRESENTED = {
  id: 5,
  startDate: '2026-02-02',
  endDate: '2026-02-06',
  reason: 'VACATION',
  notes: 'Playa',
  showNotePublicly: true,
};

const DUPLICATE_MESSAGE =
  'Ya hay un período Fuera de la oficina con esas fechas';

describe('Fuera de la oficina', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    scriptOtherSession(t);
    t.availabilities.listByUser.mockResolvedValue([DEFAULT_AVAILABILITY]);
    t.outOfOffice.findById.mockImplementation(
      async (id) => [PERIOD, BRUNOS].find((p) => p.id === id) ?? null,
    );
    t.outOfOffice.findByUserAndDates.mockResolvedValue(null);
    t.outOfOffice.create.mockResolvedValue(PERIOD);
    t.outOfOffice.update.mockResolvedValue(PERIOD);
  });
  afterEach(() => t.app.close());

  describe('GET /users/me/out-of-office', () => {
    it('answers the períodos of the Usuario, with the dates as YYYY-MM-DD', async () => {
      t.outOfOffice.listByUserEndingFrom.mockResolvedValue([PERIOD]);

      const res = await t.http
        .get('/users/me/out-of-office')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual([PRESENTED]);
    });

    it('answers an empty list when there is none', async () => {
      t.outOfOffice.listByUserEndingFrom.mockResolvedValue([]);

      const res = await t.http
        .get('/users/me/out-of-office')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('asks for the períodos that have not ended, with today read in the default Availability zone', async () => {
      // 2026-01-01T12:00Z is Jan 1 in Buenos Aires; 14 hours later it is Jan 2 in UTC but still Jan 1 there.
      t.clock.advance(14 * 60 * 60 * 1000);
      t.outOfOffice.listByUserEndingFrom.mockResolvedValue([]);

      await t.http
        .get('/users/me/out-of-office')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.outOfOffice.listByUserEndingFrom).toHaveBeenCalledWith(
        ANA.id,
        '2026-01-01',
      );
      t.clock.advance(DAY_MS);
      await t.http
        .get('/users/me/out-of-office')
        .set(bearer(CLERK_TOKEN))
        .expect(200);
      expect(t.outOfOffice.listByUserEndingFrom).toHaveBeenLastCalledWith(
        ANA.id,
        '2026-01-02',
      );
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.get('/users/me/out-of-office').expect(401);
    });
  });

  describe('POST /users/me/out-of-office', () => {
    it('creates the período and answers 201 with it', async () => {
      const res = await t.http
        .post('/users/me/out-of-office')
        .set(bearer(CLERK_TOKEN))
        .send(BODY)
        .expect(201);

      expect(res.body).toEqual(PRESENTED);
      expect(t.outOfOffice.create).toHaveBeenCalledWith(ANA.id, BODY);
    });

    it('defaults the note to null and showNotePublicly to false', async () => {
      await t.http
        .post('/users/me/out-of-office')
        .set(bearer(CLERK_TOKEN))
        .send({ startDate: '2026-02-02', endDate: '2026-02-02', reason: 'TRAVEL' })
        .expect(201);

      expect(t.outOfOffice.create).toHaveBeenCalledWith(ANA.id, {
        startDate: '2026-02-02',
        endDate: '2026-02-02',
        reason: 'TRAVEL',
        notes: null,
        showNotePublicly: false,
      });
    });

    it('accepts a período in the past and one that overlaps another', async () => {
      t.outOfOffice.listByUserEndingFrom.mockResolvedValue([PERIOD]);

      await t.http
        .post('/users/me/out-of-office')
        .set(bearer(CLERK_TOKEN))
        .send({ ...BODY, startDate: '2020-01-01', endDate: '2020-01-02' })
        .expect(201);
      await t.http
        .post('/users/me/out-of-office')
        .set(bearer(CLERK_TOKEN))
        .send({ ...BODY, startDate: '2026-02-04', endDate: '2026-02-10' })
        .expect(201);
    });

    it.each([
      ['a date that is not YYYY-MM-DD', { startDate: '02/02/2026' }],
      ['a date with a time', { endDate: '2026-02-06T00:00:00Z' }],
      ['a date that does not exist', { startDate: '2026-02-31' }],
      ['a missing date', { endDate: undefined }],
      ['an unknown reason', { reason: 'HOLIDAYS' }],
      ['notes that are not text', { notes: 42 }],
      ['showNotePublicly that is not a boolean', { showNotePublicly: 'yes' }],
    ])('answers 400 for %s', async (_name, change) => {
      await t.http
        .post('/users/me/out-of-office')
        .set(bearer(CLERK_TOKEN))
        .send({ ...BODY, ...change })
        .expect(400);
      expect(t.outOfOffice.create).not.toHaveBeenCalled();
    });

    it('answers 422 when the end date is before the start date', async () => {
      const res = await t.http
        .post('/users/me/out-of-office')
        .set(bearer(CLERK_TOKEN))
        .send({ ...BODY, startDate: '2026-02-06', endDate: '2026-02-02' })
        .expect(422);

      expect(res.body.message).toBe(
        'La fecha de fin no puede ser anterior a la de inicio',
      );
      expect(t.outOfOffice.create).not.toHaveBeenCalled();
    });

    it('answers 409 when another período has the same dates', async () => {
      t.outOfOffice.findByUserAndDates.mockResolvedValue(PERIOD);

      const res = await t.http
        .post('/users/me/out-of-office')
        .set(bearer(CLERK_TOKEN))
        .send(BODY)
        .expect(409);

      expect(res.body.message).toBe(DUPLICATE_MESSAGE);
      expect(t.outOfOffice.findByUserAndDates).toHaveBeenCalledWith(
        ANA.id,
        '2026-02-02',
        '2026-02-06',
      );
      expect(t.outOfOffice.create).not.toHaveBeenCalled();
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.post('/users/me/out-of-office').send(BODY).expect(401);
    });
  });

  describe('PUT /users/me/out-of-office/:id', () => {
    it('replaces the período and answers 200 with it', async () => {
      const res = await t.http
        .put('/users/me/out-of-office/5')
        .set(bearer(CLERK_TOKEN))
        .send({ ...BODY, reason: 'SICK_LEAVE', showNotePublicly: false })
        .expect(200);

      expect(res.body).toEqual(PRESENTED);
      expect(t.outOfOffice.update).toHaveBeenCalledWith(5, {
        ...BODY,
        reason: 'SICK_LEAVE',
        showNotePublicly: false,
      });
    });

    it('does not count the período itself as a duplicate', async () => {
      t.outOfOffice.findByUserAndDates.mockResolvedValue(PERIOD);

      await t.http
        .put('/users/me/out-of-office/5')
        .set(bearer(CLERK_TOKEN))
        .send(BODY)
        .expect(200);
    });

    it('answers 409 when another período has the same dates', async () => {
      t.outOfOffice.findByUserAndDates.mockResolvedValue({ ...PERIOD, id: 9 });

      const res = await t.http
        .put('/users/me/out-of-office/5')
        .set(bearer(CLERK_TOKEN))
        .send(BODY)
        .expect(409);

      expect(res.body.message).toBe(DUPLICATE_MESSAGE);
      expect(t.outOfOffice.update).not.toHaveBeenCalled();
    });

    it('answers 422 when the end date is before the start date', async () => {
      await t.http
        .put('/users/me/out-of-office/5')
        .set(bearer(CLERK_TOKEN))
        .send({ ...BODY, startDate: '2026-02-06', endDate: '2026-02-02' })
        .expect(422);
    });

    it('answers 400 for an unknown reason', async () => {
      await t.http
        .put('/users/me/out-of-office/5')
        .set(bearer(CLERK_TOKEN))
        .send({ ...BODY, reason: 'HOLIDAYS' })
        .expect(400);
    });

    it("answers 404 for another Usuario's período", async () => {
      const res = await t.http
        .put('/users/me/out-of-office/6')
        .set(bearer(CLERK_TOKEN))
        .send(BODY)
        .expect(404);

      expect(res.body.message).toBe('Out of office 6 not found');
      expect(t.outOfOffice.update).not.toHaveBeenCalled();
    });

    it('answers 404 for a período that does not exist', async () => {
      const res = await t.http
        .put('/users/me/out-of-office/99')
        .set(bearer(CLERK_TOKEN))
        .send(BODY)
        .expect(404);

      expect(res.body.message).toBe('Out of office 99 not found');
    });

    it('lets each Usuario change only their own', async () => {
      await t.http
        .put('/users/me/out-of-office/6')
        .set(bearer(OTHER_CLERK_TOKEN))
        .send(BODY)
        .expect(200);
    });
  });

  describe('DELETE /users/me/out-of-office/:id', () => {
    it('deletes the período and answers 204', async () => {
      await t.http
        .delete('/users/me/out-of-office/5')
        .set(bearer(CLERK_TOKEN))
        .expect(204);

      expect(t.outOfOffice.delete).toHaveBeenCalledWith(5);
    });

    it("answers 404 for another Usuario's período, and keeps it", async () => {
      const res = await t.http
        .delete('/users/me/out-of-office/6')
        .set(bearer(CLERK_TOKEN))
        .expect(404);

      expect(res.body.message).toBe('Out of office 6 not found');
      expect(t.outOfOffice.delete).not.toHaveBeenCalled();
    });

    it('answers 404 for a período that does not exist', async () => {
      await t.http
        .delete('/users/me/out-of-office/99')
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });
  });
});
