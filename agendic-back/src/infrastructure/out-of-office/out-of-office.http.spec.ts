import { Availability } from '../../domain/availabilities/availability';
import { UpcomingBooking } from '../../domain/bookings/booking';
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

const LEFT_OUTSIDE_MESSAGE =
  'Los Turnos que quedan fuera de tu horario cambiaron';

/** A Turno of Ana's inside her default Availability (Monday to Friday, 9 to 17 in Buenos Aires), at `startsAt`. */
const turno = (
  id: number,
  startsAt: string,
  over: Partial<UpcomingBooking> = {},
): UpcomingBooking => ({
  id,
  startsAt: new Date(startsAt),
  prepStartsAt: new Date(startsAt),
  endsAt: new Date(new Date(startsAt).getTime() + 30 * 60_000),
  clientName: `Cliente ${id}`,
  clientEmail: `cliente${id}@example.com`,
  availabilityId: DEFAULT_AVAILABILITY.id,
  timeZone: DEFAULT_AVAILABILITY.timeZone,
  clientTimeZone: DEFAULT_AVAILABILITY.timeZone,
  serviceName: 'Corte',
  link: `link-${id}`,
  business: null,
  branch: null,
  ...over,
});

// The default clock is 2026-01-01; the 15th is a Thursday, the 17th a Saturday.
const JAN_15 = '2026-01-15T15:00:00.000Z';
const JAN_PERIOD = {
  startDate: '2026-01-13',
  endDate: '2026-01-20',
  reason: 'VACATION',
  notes: 'Playa',
  showNotePublicly: true,
};

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
    t.availabilities.findById.mockResolvedValue(DEFAULT_AVAILABILITY);
    t.bookings.listUpcomingByUser.mockResolvedValue([]);
    t.users.findById.mockResolvedValue(ANA);
    t.outOfOffice.createCancelling.mockImplementation(
      async (_userId, _data, cancellations) => ({
        outOfOffice: PERIOD,
        cancelledIds: cancellations.map(({ id }) => id),
      }),
    );
    t.outOfOffice.updateCancelling.mockImplementation(
      async (_id, _data, cancellations) => ({
        outOfOffice: PERIOD,
        cancelledIds: cancellations.map(({ id }) => id),
      }),
    );
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

      expect(res.body).toEqual({ ...PRESENTED, cancelledBookings: 0 });
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

    describe('with Turnos left outside', () => {
      const post = (body: object) =>
        t.http.post('/users/me/out-of-office').set(bearer(CLERK_TOKEN)).send(body);

      it('cancels the confirmed Turnos with the Causa and the public note, and mails the Cliente', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, JAN_15)]);

        const res = await post({ ...JAN_PERIOD, cancelBookingIds: [7] }).expect(201);

        expect(res.body).toEqual({ ...PRESENTED, cancelledBookings: 1 });
        expect(t.outOfOffice.create).not.toHaveBeenCalled();
        expect(t.outOfOffice.createCancelling).toHaveBeenCalledWith(
          ANA.id,
          { ...JAN_PERIOD, reason: 'VACATION' },
          [{ id: 7, cause: 'OUT_OF_OFFICE', reason: 'Playa. Podés reservar otro horario.' }],
          t.clock.now(),
        );
        expect(t.mailer.sendBookingCancellationWithCause).toHaveBeenCalledWith(
          'cliente7@example.com',
          [
            {
              link: 'link-7',
              serviceName: 'Corte',
              startsAt: new Date(JAN_15),
              timeZone: 'America/Argentina/Buenos_Aires',
              reason: 'Playa. Podés reservar otro horario.',
            },
          ],
        );
      });

      it('writes nothing and answers 409 when a Turno left outside is not in the list', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([
          turno(7, JAN_15),
          turno(8, '2026-01-16T15:00:00.000Z'),
        ]);

        for (const body of [JAN_PERIOD, { ...JAN_PERIOD, cancelBookingIds: [7] }]) {
          const res = await post(body).expect(409);
          expect(res.body.message).toBe(LEFT_OUTSIDE_MESSAGE);
        }

        expect(t.outOfOffice.create).not.toHaveBeenCalled();
        expect(t.outOfOffice.createCancelling).not.toHaveBeenCalled();
        expect(t.mailer.sendBookingCancellationWithCause).not.toHaveBeenCalled();
      });

      it('answers the duplicate 409 before the Turnos one', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, JAN_15)]);
        t.outOfOffice.findByUserAndDates.mockResolvedValue(PERIOD);

        const res = await post(JAN_PERIOD).expect(409);

        expect(res.body.message).toBe(DUPLICATE_MESSAGE);
      });

      it('ignores ids that no longer fall outside', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, JAN_15)]);

        await post({ ...JAN_PERIOD, cancelBookingIds: [7, 99, 100] }).expect(201);

        expect(t.outOfOffice.createCancelling.mock.calls[0][2].map((c) => c.id)).toEqual([7]);
      });

      it('saves with no cancellation when the período falls on days the Usuario does not work', async () => {
        // The 17th is a Saturday.
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, '2026-01-17T15:00:00.000Z')]);

        const res = await post({ ...JAN_PERIOD, startDate: '2026-01-17', endDate: '2026-01-18' }).expect(201);

        expect(res.body.cancelledBookings).toBe(0);
        expect(t.outOfOffice.create).toHaveBeenCalled();
      });

      it('leaves alone a Turno that another período already blocked', async () => {
        t.outOfOffice.listByUserEndingFrom.mockResolvedValue([
          { ...PERIOD, startDate: '2026-01-14', endDate: '2026-01-16' },
        ]);
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, JAN_15)]);

        const res = await post(JAN_PERIOD).expect(201);

        expect(res.body.cancelledBookings).toBe(0);
      });

      it('counts only the Turnos the repository really cancelled, and mails only those', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([
          turno(7, JAN_15),
          turno(8, '2026-01-16T15:00:00.000Z'),
        ]);
        t.outOfOffice.createCancelling.mockResolvedValue({ outOfOffice: PERIOD, cancelledIds: [8] });

        const res = await post({ ...JAN_PERIOD, cancelBookingIds: [7, 8] }).expect(201);

        expect(res.body.cancelledBookings).toBe(1);
        expect(t.mailer.sendBookingCancellationWithCause).toHaveBeenCalledTimes(1);
        expect(t.mailer.sendBookingCancellationWithCause.mock.calls[0][0]).toBe('cliente8@example.com');
      });

      it('keeps the write when a mail fails', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, JAN_15)]);
        t.mailer.sendBookingCancellationWithCause.mockRejectedValue(new Error('smtp down'));

        const res = await post({ ...JAN_PERIOD, cancelBookingIds: [7] }).expect(201);

        expect(res.body.cancelledBookings).toBe(1);
      });

      it('keeps the fixed text as the Motivo when the note is not public', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, JAN_15)]);

        await post({ ...JAN_PERIOD, showNotePublicly: false, cancelBookingIds: [7] }).expect(201);

        expect(t.outOfOffice.createCancelling.mock.calls[0][2]).toEqual([
          {
            id: 7,
            cause: 'OUT_OF_OFFICE',
            reason: 'Ana Pérez no va a estar disponible en ese horario. Podés reservar otro horario.',
          },
        ]);
      });

      it.each([
        ['not an array', 7],
        ['not integers', ['7']],
      ])('answers 400 when cancelBookingIds is %s', async (_name, cancelBookingIds) => {
        await post({ ...JAN_PERIOD, cancelBookingIds }).expect(400);
        expect(t.outOfOffice.createCancelling).not.toHaveBeenCalled();
      });
    });
  });

  describe('POST /users/me/out-of-office/preview', () => {
    const preview = (body: object) =>
      t.http.post('/users/me/out-of-office/preview').set(bearer(CLERK_TOKEN)).send(body);

    it('answers 200 with the Turnos left outside, by start, and writes nothing', async () => {
      t.bookings.listUpcomingByUser.mockResolvedValue([
        turno(7, JAN_15, {
          business: { id: 3, name: "Ana's Salon" },
          branch: { id: 4, name: 'Downtown' },
          clientTimeZone: 'America/Montevideo',
        }),
        turno(8, '2026-01-16T15:00:00.000Z'),
      ]);

      const res = await preview(JAN_PERIOD).expect(200);

      expect(res.body).toEqual([
        {
          id: 7,
          startsAt: JAN_15,
          endsAt: '2026-01-15T15:30:00.000Z',
          timeZone: 'America/Montevideo',
          serviceName: 'Corte',
          clientName: 'Cliente 7',
          business: { id: 3, name: "Ana's Salon" },
          branch: { id: 4, name: 'Downtown' },
          cancellationCause: 'OUT_OF_OFFICE',
          cancellationReason: 'Playa. Podés reservar otro horario.',
        },
        expect.objectContaining({ id: 8, business: null, branch: null }),
      ]);
      expect(res.body[0]).not.toHaveProperty('clientEmail');
      expect(res.body[0]).not.toHaveProperty('link');
      expect(t.outOfOffice.create).not.toHaveBeenCalled();
      expect(t.outOfOffice.createCancelling).not.toHaveBeenCalled();
      expect(t.mailer.sendBookingCancellationWithCause).not.toHaveBeenCalled();
    });

    it('asks only for the Turnos in a window of a day before the período to two days after it', async () => {
      await preview(JAN_PERIOD).expect(200);

      expect(t.bookings.listUpcomingByUser).toHaveBeenCalledWith(
        ANA.id,
        new Date('2026-01-12T00:00:00.000Z'),
        new Date('2026-01-22T00:00:00.000Z'),
      );
    });

    it('answers [] when nothing falls outside', async () => {
      t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, '2026-01-17T15:00:00.000Z')]);

      const res = await preview(JAN_PERIOD).expect(200);

      expect(res.body).toEqual([]);
    });

    it('does not return a Turno that already started', async () => {
      t.clock.advance(14 * DAY_MS);

      await preview(JAN_PERIOD).expect(200);

      // The window opens at `now`, so nothing earlier is asked for.
      expect(t.bookings.listUpcomingByUser.mock.calls[0][1]).toEqual(t.clock.now());
    });

    it.each([
      ['a missing date', { endDate: undefined }, 400],
      ['an unknown reason', { reason: 'HOLIDAYS' }, 400],
      ['the end date before the start date', { startDate: '2026-01-20', endDate: '2026-01-13' }, 422],
    ])('answers the same error as creating for %s', async (_name, change, status) => {
      await preview({ ...JAN_PERIOD, ...change }).expect(status);
      expect(t.bookings.listUpcomingByUser).not.toHaveBeenCalled();
    });

    it('answers 409 when another período has the same dates, before calculating anything', async () => {
      t.outOfOffice.findByUserAndDates.mockResolvedValue(PERIOD);

      const res = await preview(JAN_PERIOD).expect(409);

      expect(res.body.message).toBe(DUPLICATE_MESSAGE);
      expect(t.bookings.listUpcomingByUser).not.toHaveBeenCalled();
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.post('/users/me/out-of-office/preview').send(JAN_PERIOD).expect(401);
    });
  });

  describe('PUT /users/me/out-of-office/:id', () => {
    it('replaces the período and answers 200 with it', async () => {
      const res = await t.http
        .put('/users/me/out-of-office/5')
        .set(bearer(CLERK_TOKEN))
        .send({ ...BODY, reason: 'SICK_LEAVE', showNotePublicly: false })
        .expect(200);

      expect(res.body).toEqual({ ...PRESENTED, cancelledBookings: 0 });
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

  // Ana's período 5 as it was saved: the 13th to the 20th of January. The editing tests widen, shrink or move it.
  describe('editing a período with Turnos', () => {
    const SAVED: OutOfOffice = { ...PERIOD, startDate: '2026-01-13', endDate: '2026-01-20' };
    const JAN_22 = '2026-01-22T15:00:00.000Z';
    const WIDER = { ...JAN_PERIOD, endDate: '2026-01-25' };

    beforeEach(() => {
      t.outOfOffice.findById.mockImplementation(async (id) => (id === 5 ? SAVED : null));
      t.outOfOffice.listByUserEndingFrom.mockResolvedValue([SAVED]);
    });

    const preview = (body: object, id = 5) =>
      t.http.post(`/users/me/out-of-office/${id}/preview`).set(bearer(CLERK_TOKEN)).send(body);
    const put = (body: object, id = 5) =>
      t.http.put(`/users/me/out-of-office/${id}`).set(bearer(CLERK_TOKEN)).send(body);

    describe('POST /users/me/out-of-office/:id/preview', () => {
      it('answers only the Turnos of the days the edit adds, and writes nothing', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, JAN_15), turno(8, JAN_22)]);

        const res = await preview(WIDER).expect(200);

        expect(res.body.map((b: { id: number }) => b.id)).toEqual([8]);
        expect(res.body[0]).toMatchObject({
          cancellationCause: 'OUT_OF_OFFICE',
          cancellationReason: 'Playa. Podés reservar otro horario.',
        });
        expect(res.body[0]).not.toHaveProperty('clientEmail');
        expect(t.outOfOffice.update).not.toHaveBeenCalled();
        expect(t.outOfOffice.updateCancelling).not.toHaveBeenCalled();
        expect(t.mailer.sendBookingCancellationWithCause).not.toHaveBeenCalled();
      });

      it('answers [] when only the note, the Motivo or its visibility change', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, JAN_15), turno(8, JAN_22)]);

        for (const change of [
          { notes: 'Otra' },
          { reason: 'TRAVEL' },
          { showNotePublicly: false },
        ])
          expect((await preview({ ...JAN_PERIOD, ...change }).expect(200)).body).toEqual([]);
      });

      it('answers [] when the período shrinks', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, JAN_15), turno(8, JAN_22)]);

        const res = await preview({ ...JAN_PERIOD, startDate: '2026-01-14', endDate: '2026-01-16' }).expect(200);

        expect(res.body).toEqual([]);
      });

      it('answers the Turnos of the new dates when the período moves', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, JAN_15), turno(8, JAN_22)]);

        const res = await preview({ ...JAN_PERIOD, startDate: '2026-01-21', endDate: '2026-01-23' }).expect(200);

        expect(res.body.map((b: { id: number }) => b.id)).toEqual([8]);
      });

      it('looks for Turnos in a window that covers the old dates and the new ones', async () => {
        await preview({ ...JAN_PERIOD, startDate: '2026-01-21', endDate: '2026-01-23' }).expect(200);

        const [, from, to] = t.bookings.listUpcomingByUser.mock.calls[0];
        expect(from).toEqual(new Date('2026-01-12T00:00:00.000Z'));
        expect(to).toEqual(new Date('2026-01-25T00:00:00.000Z'));
      });

      it("answers 404 for another Usuario's período and for one that does not exist", async () => {
        t.outOfOffice.findById.mockImplementation(async (id) => (id === 6 ? BRUNOS : null));

        await preview(BODY, 6).expect(404);
        await preview(BODY, 99).expect(404);
        expect(t.bookings.listUpcomingByUser).not.toHaveBeenCalled();
      });

      it('answers 422 and 409 for the same causes as the PUT, and 400 for a bad body', async () => {
        await preview({ ...BODY, startDate: '2026-02-06', endDate: '2026-02-02' }).expect(422);
        await preview({ ...BODY, reason: 'HOLIDAYS' }).expect(400);
        t.outOfOffice.findByUserAndDates.mockResolvedValue({ ...PERIOD, id: 9 });
        const res = await preview(BODY).expect(409);
        expect(res.body.message).toBe(DUPLICATE_MESSAGE);
      });

      it('answers 401 without a Sesión', async () => {
        await t.http.post('/users/me/out-of-office/5/preview').send(BODY).expect(401);
      });
    });

    describe('PUT /users/me/out-of-office/:id', () => {
      it('cancels only the Turnos of the added days, with the Causa, and mails the Cliente', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, JAN_15), turno(8, JAN_22)]);

        const res = await put({ ...WIDER, cancelBookingIds: [8] }).expect(200);

        expect(res.body).toEqual({ ...PRESENTED, cancelledBookings: 1 });
        expect(t.outOfOffice.update).not.toHaveBeenCalled();
        expect(t.outOfOffice.updateCancelling).toHaveBeenCalledWith(
          5,
          { ...WIDER, reason: 'VACATION' },
          [{ id: 8, cause: 'OUT_OF_OFFICE', reason: 'Playa. Podés reservar otro horario.' }],
          t.clock.now(),
        );
        expect(t.mailer.sendBookingCancellationWithCause).toHaveBeenCalledTimes(1);
        expect(t.mailer.sendBookingCancellationWithCause).toHaveBeenCalledWith(
          'cliente8@example.com',
          [expect.objectContaining({ link: 'link-8' })],
        );
      });

      it('cancels the Turnos of the new dates when the período moves', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, JAN_15), turno(8, JAN_22)]);
        const moved = { ...JAN_PERIOD, startDate: '2026-01-21', endDate: '2026-01-23' };

        const res = await put({ ...moved, cancelBookingIds: [8] }).expect(200);

        expect(res.body.cancelledBookings).toBe(1);
        expect(t.outOfOffice.updateCancelling.mock.calls[0][2].map((c) => c.id)).toEqual([8]);
      });

      it('writes nothing and answers 409 when a Turno left outside is not in the list', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(8, JAN_22)]);

        for (const body of [WIDER, { ...WIDER, cancelBookingIds: [7] }]) {
          const res = await put(body).expect(409);
          expect(res.body.message).toBe(LEFT_OUTSIDE_MESSAGE);
        }

        expect(t.outOfOffice.update).not.toHaveBeenCalled();
        expect(t.outOfOffice.updateCancelling).not.toHaveBeenCalled();
        expect(t.mailer.sendBookingCancellationWithCause).not.toHaveBeenCalled();
      });

      it('saves with no cancellation when only the note changes or the período shrinks', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, JAN_15), turno(8, JAN_22)]);

        for (const change of [{ notes: 'Otra' }, { endDate: '2026-01-16' }]) {
          const res = await put({ ...JAN_PERIOD, ...change }).expect(200);
          expect(res.body.cancelledBookings).toBe(0);
        }

        expect(t.outOfOffice.update).toHaveBeenCalledTimes(2);
        expect(t.outOfOffice.updateCancelling).not.toHaveBeenCalled();
      });

      it('ignores ids that no longer fall outside', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(8, JAN_22)]);

        await put({ ...WIDER, cancelBookingIds: [8, 7, 99] }).expect(200);

        expect(t.outOfOffice.updateCancelling.mock.calls[0][2].map((c) => c.id)).toEqual([8]);
      });

      it('answers the duplicate 409 before the Turnos one', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(8, JAN_22)]);
        t.outOfOffice.findByUserAndDates.mockResolvedValue({ ...PERIOD, id: 9 });

        const res = await put(WIDER).expect(409);

        expect(res.body.message).toBe(DUPLICATE_MESSAGE);
      });

      it("answers 404 for another Usuario's período, before looking at Turnos", async () => {
        t.outOfOffice.findById.mockImplementation(async (id) => (id === 6 ? BRUNOS : null));

        await put({ ...WIDER, cancelBookingIds: [8] }, 6).expect(404);

        expect(t.bookings.listUpcomingByUser).not.toHaveBeenCalled();
        expect(t.outOfOffice.updateCancelling).not.toHaveBeenCalled();
      });

      it('answers 400 when cancelBookingIds is not an array of integers', async () => {
        await put({ ...WIDER, cancelBookingIds: 'x' }).expect(400);
        await put({ ...WIDER, cancelBookingIds: ['a'] }).expect(400);
      });
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
