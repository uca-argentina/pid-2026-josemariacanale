import {
  Availability,
  emptySchedule,
} from '../../domain/availabilities/availability';
import { UpcomingBooking } from '../../domain/bookings/booking';
import { OutOfOfficeReason } from '../../domain/out-of-office/out-of-office';
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

const LEFT_OUTSIDE_MESSAGE =
  'Los Turnos que quedan fuera de tu horario cambiaron';

const REASON =
  'Ana Pérez cambió sus horarios y ya no atiende en ese horario. Podés reservar otro horario.';

/** A Turno of Ana's inside GENERAL (Monday to Friday, 9 to 17 in Buenos Aires) at `startsAt`. */
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
  availabilityId: GENERAL.id,
  timeZone: GENERAL.timeZone,
  clientTimeZone: GENERAL.timeZone,
  serviceName: 'Corte',
  link: `link-${id}`,
  business: null,
  branch: null,
  ...over,
});

// The default clock is 2026-01-01. Wednesday the 14th at 15:00 Buenos Aires; Thursday the 15th at 12:00.
const WED_15H = '2026-01-14T18:00:00.000Z';
const THU_12H = '2026-01-15T15:00:00.000Z';

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
    t.bookings.listUpcomingByUser.mockResolvedValue([]);
    t.users.findById.mockResolvedValue(ANA);
    t.availabilities.findById.mockImplementation(
      async (id) =>
        [GENERAL, AFTERNOON, BRUNOS].find((a) => a.id === id) ?? null,
    );
  });
  afterEach(() => t.app.close());

  describe('GET /availabilities', () => {
    it('lists the Usuario Availabilities with their Franjas but not their Anulaciones, the default marked', async () => {
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
          schedule: workWeek('09:00', '17:00'),
        },
        {
          id: 2,
          name: 'Turno tarde',
          isDefault: false,
          timeZone: 'Europe/Madrid',
          schedule: [[], [], [], [], [], [], []],
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

      expect(res.body).toEqual({
        id: 1,
        isDefault: true,
        ...body,
        cancelledBookings: 0,
      });
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
      [
        'a range that ends before it starts',
        [{ start: '17:00', end: '09:00' }],
      ],
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

  describe('saving with Turnos left outside', () => {
    const preview = (body: object, id = 1) =>
      t.http
        .post(`/availabilities/${id}/preview`)
        .set(bearer(CLERK_TOKEN))
        .send(body);
    const put = (body: object, id = 1) =>
      t.http.put(`/availabilities/${id}`).set(bearer(CLERK_TOKEN)).send(body);

    /** Wednesday shrinks from 9–17 to 9–12. */
    const shrunk = () => {
      const schedule = workWeek('09:00', '17:00');
      schedule[3] = [{ start: '09:00', end: '12:00' }];
      return { ...BODY, schedule };
    };

    beforeEach(() => {
      t.availabilities.replace.mockImplementation(async (id, data) => ({
        ...GENERAL,
        id,
        ...data,
      }));
      t.availabilities.replaceCancelling.mockImplementation(
        async (id, data, cancellations) => ({
          availability: { ...GENERAL, id, ...data },
          cancelledIds: cancellations.map(({ id }) => id),
        }),
      );
    });

    describe('POST /availabilities/:id/preview', () => {
      it('answers the Turnos a smaller Franja leaves outside, with the Causa, and writes nothing', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([
          turno(7, WED_15H, { business: { id: 3, name: 'Salon' } }),
          turno(8, '2026-01-14T13:00:00.000Z'),
        ]);

        const res = await preview(shrunk()).expect(200);

        expect(res.body).toEqual([
          {
            id: 7,
            startsAt: WED_15H,
            endsAt: '2026-01-14T18:30:00.000Z',
            timeZone: GENERAL.timeZone,
            serviceName: 'Corte',
            clientName: 'Cliente 7',
            business: { id: 3, name: 'Salon' },
            branch: null,
            cancellationCause: 'SCHEDULE_CHANGE',
            cancellationReason: REASON,
          },
        ]);
        expect(res.body[0]).not.toHaveProperty('clientEmail');
        expect(res.body[0]).not.toHaveProperty('link');
        expect(t.availabilities.replace).not.toHaveBeenCalled();
        expect(t.availabilities.replaceCancelling).not.toHaveBeenCalled();
        expect(t.mailer.sendBookingCancellationWithCause).not.toHaveBeenCalled();
      });

      it('looks at every future Turno, from now', async () => {
        await preview(shrunk()).expect(200);

        expect(t.bookings.listUpcomingByUser).toHaveBeenCalledWith(
          ANA.id,
          t.clock.now(),
        );
      });

      it('answers the Turnos of a día libre Anulación, and only those outside the hours of one with hours', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([
          turno(7, WED_15H),
          turno(8, '2026-01-14T13:00:00.000Z'),
        ]);

        const free = await preview({
          ...BODY,
          overrides: [{ date: '2026-01-14', ranges: [] }],
        }).expect(200);
        const withHours = await preview({
          ...BODY,
          overrides: [
            { date: '2026-01-14', ranges: [{ start: '09:00', end: '12:00' }] },
          ],
        }).expect(200);

        expect(free.body.map(({ id }: { id: number }) => id)).toEqual([7, 8]);
        expect(withHours.body.map(({ id }: { id: number }) => id)).toEqual([7]);
      });

      it('answers the Turnos that fall outside when the time zone changes', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, WED_15H)]);

        // 15:00 in Buenos Aires is 19:00 in Madrid: past the 17:00 end.
        const res = await preview({
          ...BODY,
          timeZone: 'Europe/Madrid',
        }).expect(200);

        expect(res.body.map(({ id }: { id: number }) => id)).toEqual([7]);
      });

      it('ignores the Turnos attended with another Availability', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([
          turno(7, WED_15H, { availabilityId: AFTERNOON.id }),
        ]);

        const res = await preview(shrunk()).expect(200);

        expect(res.body).toEqual([]);
      });

      it('ignores a Turno that was already outside, and answers [] when nothing changes', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([
          turno(7, WED_15H),
          // Saturday: not worked before either.
          turno(8, '2026-01-17T15:00:00.000Z'),
        ]);

        expect((await preview(BODY).expect(200)).body).toEqual([]);
        const res = await preview({
          ...BODY,
          overrides: [{ date: '2026-01-17', ranges: [] }],
        }).expect(200);
        expect(res.body).toEqual([]);
      });

      it('keeps counting the períodos Fuera de la oficina: a Turno they already blocked is not returned', async () => {
        t.outOfOffice.listByUserEndingFrom.mockResolvedValue([
          {
            id: 5,
            userId: ANA.id,
            startDate: '2026-01-14',
            endDate: '2026-01-14',
            reason: OutOfOfficeReason.VACATION,
            notes: null,
            showNotePublicly: false,
          },
        ]);
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, WED_15H)]);

        const res = await preview(shrunk()).expect(200);

        expect(res.body).toEqual([]);
      });

      it('answers the same errors as the PUT: 404, 400 and 422', async () => {
        await preview(BODY, 3).expect(404);
        await preview(BODY, 99).expect(404);
        await preview({ ...BODY, schedule: [] }).expect(400);
        await preview({ ...BODY, timeZone: 'Mars/Olympus' }).expect(422);
      });

      it('answers 401 without a Sesión', async () => {
        await t.http.post('/availabilities/1/preview').send(BODY).expect(401);
      });
    });

    describe('PUT /availabilities/:id', () => {
      it('cancels the confirmed Turnos with the Causa, answers cancelledBookings and mails the Cliente', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, WED_15H)]);
        const body = shrunk();

        const res = await put({ ...body, cancelBookingIds: [7] }).expect(200);

        expect(res.body).toEqual({
          id: 1,
          isDefault: true,
          ...body,
          cancelledBookings: 1,
        });
        expect(t.availabilities.replace).not.toHaveBeenCalled();
        expect(t.availabilities.replaceCancelling).toHaveBeenCalledWith(
          1,
          body,
          [{ id: 7, cause: 'SCHEDULE_CHANGE', reason: REASON }],
          t.clock.now(),
        );
        expect(t.mailer.sendBookingCancellationWithCause).toHaveBeenCalledWith(
          'cliente7@example.com',
          [
            {
              link: 'link-7',
              serviceName: 'Corte',
              startsAt: new Date(WED_15H),
              timeZone: GENERAL.timeZone,
              reason: REASON,
            },
          ],
        );
      });

      it('writes nothing and answers 409 when a Turno left outside is not in the list', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([
          turno(7, WED_15H),
          turno(8, THU_12H),
        ]);
        const schedule = workWeek('09:00', '17:00');
        schedule[3] = [{ start: '09:00', end: '12:00' }];
        schedule[4] = [{ start: '09:00', end: '11:00' }];

        for (const extra of [{}, { cancelBookingIds: [7] }]) {
          const res = await put({ ...BODY, schedule, ...extra }).expect(409);
          expect(res.body.message).toBe(LEFT_OUTSIDE_MESSAGE);
        }

        expect(t.availabilities.replace).not.toHaveBeenCalled();
        expect(t.availabilities.replaceCancelling).not.toHaveBeenCalled();
        expect(t.mailer.sendBookingCancellationWithCause).not.toHaveBeenCalled();
      });

      it('ignores ids that no longer fall outside', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, WED_15H)]);

        await put({ ...shrunk(), cancelBookingIds: [7, 99] }).expect(200);

        expect(
          t.availabilities.replaceCancelling.mock.calls[0][2].map((c) => c.id),
        ).toEqual([7]);
      });

      it('saves with no cancellation when nothing falls outside', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, THU_12H)]);

        const res = await put(shrunk()).expect(200);

        expect(res.body.cancelledBookings).toBe(0);
        expect(t.availabilities.replace).toHaveBeenCalled();
        expect(t.availabilities.replaceCancelling).not.toHaveBeenCalled();
      });

      it('counts only the Turnos the repository really cancelled, and mails only those', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([
          turno(7, WED_15H),
          turno(8, '2026-01-21T18:00:00.000Z'),
        ]);
        t.availabilities.replaceCancelling.mockImplementation(
          async (id, data) => ({
            availability: { ...GENERAL, id, ...data },
            cancelledIds: [7],
          }),
        );
        const schedule = workWeek('09:00', '17:00');
        schedule[3] = [{ start: '09:00', end: '12:00' }];

        const res = await put({
          ...BODY,
          schedule,
          cancelBookingIds: [7, 8],
        }).expect(200);

        expect(res.body.cancelledBookings).toBe(1);
        expect(t.mailer.sendBookingCancellationWithCause).toHaveBeenCalledTimes(1);
      });

      it('keeps the write when a mail fails', async () => {
        t.bookings.listUpcomingByUser.mockResolvedValue([turno(7, WED_15H)]);
        t.mailer.sendBookingCancellationWithCause.mockRejectedValue(
          new Error('smtp down'),
        );

        const res = await put({ ...shrunk(), cancelBookingIds: [7] }).expect(200);

        expect(res.body.cancelledBookings).toBe(1);
      });

      it("answers 404 for another Usuario's Availability, before looking at Turnos", async () => {
        await put(BODY, 3).expect(404);

        expect(t.bookings.listUpcomingByUser).not.toHaveBeenCalled();
      });

      it('answers 400 when cancelBookingIds is not an array of integers', async () => {
        await put({ ...BODY, cancelBookingIds: 'all' }).expect(400);
        await put({ ...BODY, cancelBookingIds: ['x'] }).expect(400);
      });
    });
  });
});
