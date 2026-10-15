import { Availability } from '../../domain/availabilities/availability';
import {
  Booking,
  BookingActor,
  BookingStatus,
  CancellationCause,
} from '../../domain/bookings/booking';
import { ConflictError, NotFoundError } from '../../domain/errors';
import {
  ANAS_BRANCH,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  bearer,
  CLERK_TOKEN,
  createTestApp,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  TestApp,
  workWeek,
} from '../../test-app';

const BOOKED: Booking = {
  id: 7,
  serviceId: ANAS_SERVICE.id,
  employeeId: ANAS_EMPLOYEE.id,
  userId: ANAS_EMPLOYEE.userId,
  cabinId: null,
  clientName: 'Carla Gómez',
  clientEmail: 'carla@example.com',
  prepStartsAt: new Date('2026-01-02T13:50:00.000Z'),
  startsAt: new Date('2026-01-02T14:00:00.000Z'), // Friday 11:00 ARG
  endsAt: new Date('2026-01-02T14:30:00.000Z'),
  status: BookingStatus.BOOKED,
  notes: null,
  noShowAt: null,
  employeeNoShowAt: null,
  link: 'booking-link-secret',
  fromRescheduleId: null,
  employeeChosen: false,
  depositAmount: null,
  depositPaidAt: null,
  price: 50,
  cancelledAt: null,
  rejectedAt: null,
  acceptedAt: null,
  cancelledBy: null,
  cancellationReason: null,
  cancellationCause: null,
};

const AVAILABILITY: Availability = {
  id: 10,
  userId: ANAS_EMPLOYEE.userId,
  name: 'Horas laborables',
  timeZone: ANAS_BRANCH.timeZone,
  isDefault: true,
  schedule: workWeek('09:00', '18:00'),
  overrides: [],
};

describe('Mis turnos del Usuario', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    scriptOtherSession(t);
    t.bookings.findById.mockResolvedValue(BOOKED);
    t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);
  });
  afterEach(() => t.app.close());

  describe('GET /users/me/bookings', () => {
    it('lists the Turnos the Usuario attends, with where they happen', async () => {
      t.bookings.listByUser.mockResolvedValue([
        {
          ...BOOKED,
          cabin: { id: 10, name: 'Box 1' },
          id: 1,
          serviceName: 'Haircut',
          business: { id: 1, name: 'Negocio 1' },
          branch: { id: 10, name: 'Downtown' },
        },
        {
          ...BOOKED,
          cabin: null,
          id: 2,
          employeeId: null,
          serviceName: 'Clase de guitarra',
          business: null,
          branch: null,
        },
      ]);

      const res = await t.http
        .get('/users/me/bookings')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.bookings.listByUser).toHaveBeenCalledWith(ANAS_EMPLOYEE.userId);
      expect(res.body).toEqual([
        {
          id: 1,
          employeeId: ANAS_EMPLOYEE.id,
          status: 'BOOKED',
          startsAt: BOOKED.startsAt.toISOString(),
          endsAt: BOOKED.endsAt.toISOString(),
          clientName: 'Carla Gómez',
          clientEmail: 'carla@example.com',
          noShowAt: null,
          employeeNoShowAt: null,
          acceptedAt: null,
          cancelledBy: null,
          cancellationReason: null,
          cancellationCause: null,
          employeeChosen: false,
          fromRescheduleId: null,
          depositAmount: null,
          depositPaidAt: null,
          cabin: { id: 10, name: 'Box 1' },
          serviceId: ANAS_SERVICE.id,
          serviceName: 'Haircut',
          business: { id: 1, name: 'Negocio 1' },
          branch: { id: 10, name: 'Downtown' },
        },
        expect.objectContaining({
          id: 2,
          cabin: null,
          employeeId: null,
          business: null,
          branch: null,
        }),
      ]);
    });

    it('lists the Causa de cancelación of a Turno that has one', async () => {
      t.bookings.listByUser.mockResolvedValue([
        {
          ...BOOKED,
          status: BookingStatus.CANCELLED,
          cancelledBy: BookingActor.EMPLOYEE,
          cancellationReason: 'Ana no atiende por Navidad. Podés reservar otro horario.',
          cancellationCause: CancellationCause.PUBLIC_HOLIDAY,
          cabin: null,
          serviceName: 'Haircut',
          business: null,
          branch: null,
        },
      ]);

      const res = await t.http
        .get('/users/me/bookings')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body[0].cancellationCause).toBe('PUBLIC_HOLIDAY');
    });

    it('lists the Seña of a Turno and when it was paid', async () => {
      t.bookings.listByUser.mockResolvedValue([
        {
          ...BOOKED,
          cabin: null,
          depositAmount: 6,
          depositPaidAt: new Date('2026-01-01T10:00:00.000Z'),
          serviceName: 'Haircut',
          business: null,
          branch: null,
        },
      ]);

      const res = await t.http
        .get('/users/me/bookings')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body[0]).toMatchObject({
        depositAmount: 6,
        depositPaidAt: '2026-01-01T10:00:00.000Z',
      });
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.get('/users/me/bookings').expect(401);
    });

    it('no longer answers on the Empleado path', async () => {
      await t.http
        .get('/employees/me/bookings')
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });
  });

  describe('PATCH /bookings/:id/cancel', () => {
    const patch = (token?: string) => {
      const req = t.http.patch(`/bookings/${BOOKED.id}/cancel`);
      return token ? req.set(bearer(token)) : req;
    };

    it('moves a BOOKED Turno to CANCELLED for the assigned Empleado', async () => {
      t.bookings.cancel.mockResolvedValue({
        ...BOOKED,
        status: BookingStatus.CANCELLED,
      });

      const res = await patch(CLERK_TOKEN).expect(200);

      expect(t.bookings.cancel).toHaveBeenCalledWith(BOOKED.id, t.clock.now(), null);
      expect(res.body).toMatchObject({ id: BOOKED.id, status: 'CANCELLED' });
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledWith(
        BOOKED.clientEmail,
        BOOKED.link,
        null,
      );
    });

    it('saves the Motivo de cancelación, trimmed, and puts it in the Aviso de cambio del Turno', async () => {
      t.bookings.cancel.mockResolvedValue({
        ...BOOKED,
        status: BookingStatus.CANCELLED,
        cancelledBy: BookingActor.EMPLOYEE,
        cancellationReason: 'Estoy enfermo',
      });

      const res = await patch(CLERK_TOKEN).send({ reason: '  Estoy enfermo ' }).expect(200);

      expect(t.bookings.cancel).toHaveBeenCalledWith(BOOKED.id, t.clock.now(), 'Estoy enfermo');
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledWith(
        BOOKED.clientEmail,
        BOOKED.link,
        'Estoy enfermo',
      );
      expect(res.body).toMatchObject({ cancelledBy: 'EMPLOYEE', cancellationReason: 'Estoy enfermo' });
    });

    it('takes a blank reason as none', async () => {
      t.bookings.cancel.mockResolvedValue({ ...BOOKED, status: BookingStatus.CANCELLED });

      await patch(CLERK_TOKEN).send({ reason: '   ' }).expect(200);

      expect(t.bookings.cancel).toHaveBeenCalledWith(BOOKED.id, t.clock.now(), null);
    });

    it('answers 400 reason is too long over 500 characters, without cancelling', async () => {
      const res = await patch(CLERK_TOKEN).send({ reason: 'a'.repeat(501) }).expect(400);

      expect(res.body.message).toContain('reason is too long');
      expect(t.bookings.cancel).not.toHaveBeenCalled();
    });

    it('still answers 200 when the Cliente mail fails, since the Turno is already cancelled', async () => {
      t.bookings.cancel.mockResolvedValue({
        ...BOOKED,
        status: BookingStatus.CANCELLED,
      });
      t.mailer.sendBookingCancellation.mockRejectedValue(new Error('SMTP down'));

      await patch(CLERK_TOKEN).expect(200);
    });

    it.each([BookingStatus.PENDING, BookingStatus.CANCELLED])(
      'answers 422 when the Turno is %s',
      async (status) => {
        t.bookings.findById.mockResolvedValue({ ...BOOKED, status });

        await patch(CLERK_TOKEN).expect(422);
        expect(t.bookings.cancel).not.toHaveBeenCalled();
      },
    );

    it('answers 403 for a Usuario who is not the assigned Empleado', async () => {
      await patch(OTHER_CLERK_TOKEN).expect(403);
      expect(t.bookings.cancel).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Turno', async () => {
      t.bookings.findById.mockRejectedValue(new NotFoundError('Booking not found'));

      await patch(CLERK_TOKEN).expect(404);
    });

    it('answers 401 without a Sesión', async () => {
      await patch().expect(401);
    });
  });

  describe('PATCH /bookings/:id/reschedule', () => {
    const NEW_START = '2026-01-02T15:00:00.000Z'; // Friday 12:00 ARG
    const patch = (body: object, token: string | undefined = CLERK_TOKEN) => {
      const req = t.http.patch(`/bookings/${BOOKED.id}/reschedule`).send(body);
      return token ? req.set(bearer(token)) : req;
    };

    beforeEach(() => {
      t.bookings.lastReceivedByEmployee.mockResolvedValue(new Map());
      t.services.findById.mockResolvedValue(ANAS_SERVICE);
      t.branches.findById.mockResolvedValue(ANAS_BRANCH);
      t.availabilities.findById.mockResolvedValue(AVAILABILITY);
      t.bookings.listOccupiedByUser.mockResolvedValue([]);
      t.bookings.reschedule.mockResolvedValue({
        ...BOOKED,
        cabin: null,
        startsAt: new Date(NEW_START),
        endsAt: new Date('2026-01-02T15:30:00.000Z'),
      });
    });

    it("moves a BOOKED Turno to another Horario reservable, keeping its duration and BOOKED, with the Servicio's current Tiempo de preparación", async () => {
      t.services.findById.mockResolvedValue({ ...ANAS_SERVICE, prepMinutes: 15 });

      const res = await patch({ startsAt: NEW_START }).expect(200);

      expect(t.bookings.reschedule).toHaveBeenCalledWith(BOOKED.id, {
        employeeId: ANAS_EMPLOYEE.id,
        userId: ANAS_EMPLOYEE.userId,
        cabinId: null,
        prepStartsAt: new Date('2026-01-02T14:45:00.000Z'),
        startsAt: new Date(NEW_START),
        endsAt: new Date('2026-01-02T15:30:00.000Z'),
      }, expect.any(Date));
      expect(t.bookings.listOccupiedByUser).toHaveBeenCalledWith(
        ANAS_EMPLOYEE.id,
        expect.any(Date),
        expect.any(Date),
        BOOKED.id,
      );
      expect(res.body).toMatchObject({
        id: BOOKED.id,
        status: 'BOOKED',
        startsAt: NEW_START,
      });
      expect(t.mailer.sendBookingReschedule).toHaveBeenCalledWith(
        BOOKED.clientEmail,
        BOOKED.link,
      );
    });

    describe('con Cabinas (ADR 0030)', () => {
      const BOX = { id: 10, name: 'Box 1' };
      const LASER = { id: 11, name: 'Láser' };
      const NEW_END = new Date('2026-01-02T15:30:00.000Z');
      const occupy = (
        ...occupied: { cabinId: number; prepStartsAt: Date; endsAt: Date }[]
      ) =>
        t.bookings.listOccupiedByCabins.mockImplementation(
          async (cabinIds, from, to, excludeBookingId) =>
            occupied.filter(
              (o) =>
                cabinIds.includes(o.cabinId) &&
                o.prepStartsAt < to &&
                o.endsAt > from &&
                !(excludeBookingId === BOOKED.id && o === OWN),
            ),
        );
      /** The Turno being moved holds the Cabina over its current tramo. */
      const OWN = {
        cabinId: BOX.id,
        prepStartsAt: BOOKED.prepStartsAt,
        endsAt: BOOKED.endsAt,
      };
      const cabinOfReschedule = () =>
        t.bookings.reschedule.mock.calls[0][1].cabinId;

      beforeEach(() => {
        t.services.findById.mockResolvedValue({
          ...ANAS_SERVICE,
          cabins: [BOX, LASER],
        });
        t.bookings.findById.mockResolvedValue({ ...BOOKED, cabinId: BOX.id });
        t.bookings.lastReceivedByCabin.mockResolvedValue(new Map());
        occupy(OWN);
      });

      it('conserva la Cabina si está libre en el horario nuevo, aunque otra lleve más tiempo sin recibir un Turno', async () => {
        t.bookings.lastReceivedByCabin.mockResolvedValue(
          new Map([[BOX.id, new Date('2026-01-01T10:00:00.000Z')]]),
        );

        await patch({ startsAt: NEW_START }).expect(200);

        expect(cabinOfReschedule()).toBe(BOX.id);
      });

      it('pasa a otra libre si la suya está ocupada en el horario nuevo', async () => {
        occupy(OWN, {
          cabinId: BOX.id,
          prepStartsAt: new Date(NEW_START),
          endsAt: NEW_END,
        });

        await patch({ startsAt: NEW_START }).expect(200);

        expect(cabinOfReschedule()).toBe(LASER.id);
      });

      it('pasa a otra si la suya ya no está entre las que admite el Servicio', async () => {
        t.services.findById.mockResolvedValue({
          ...ANAS_SERVICE,
          cabins: [LASER],
        });

        await patch({ startsAt: NEW_START }).expect(200);

        expect(cabinOfReschedule()).toBe(LASER.id);
      });

      it('asigna una a un Turno sin Cabina de un Servicio que ahora las admite', async () => {
        t.bookings.findById.mockResolvedValue({ ...BOOKED, cabinId: null });

        await patch({ startsAt: NEW_START }).expect(200);

        expect(cabinOfReschedule()).toBe(BOX.id);
      });

      it('deja null la Cabina si el Servicio ya no admite ninguna', async () => {
        t.services.findById.mockResolvedValue(ANAS_SERVICE);

        await patch({ startsAt: NEW_START }).expect(200);

        expect(cabinOfReschedule()).toBeNull();
        expect(t.bookings.listOccupiedByCabins).not.toHaveBeenCalled();
      });

      it('no se bloquea por su propia Cabina al moverse a un horario que se solapa con el actual', async () => {
        t.services.findById.mockResolvedValue({
          ...ANAS_SERVICE,
          slotInterval: 15,
          cabins: [BOX],
        });
        const overlapping = '2026-01-02T14:15:00.000Z';

        await patch({ startsAt: overlapping }).expect(200);

        expect(cabinOfReschedule()).toBe(BOX.id);
        expect(t.bookings.listOccupiedByCabins).toHaveBeenCalledWith(
          [BOX.id],
          expect.any(Date),
          expect.any(Date),
          BOOKED.id,
        );
      });

      it('answers 422 y no lo mueve si no queda ninguna Cabina libre en el horario nuevo', async () => {
        const atNewStart = { prepStartsAt: new Date(NEW_START), endsAt: NEW_END };
        occupy(
          OWN,
          { cabinId: BOX.id, ...atNewStart },
          { cabinId: LASER.id, ...atNewStart },
        );

        const res = await patch({ startsAt: NEW_START }).expect(422);

        expect(res.body.message).toBe(
          `Slot ${NEW_START} is not available for Service ${ANAS_SERVICE.id}`,
        );
        expect(t.bookings.reschedule).not.toHaveBeenCalled();
      });

      it('con Empleado elegido conserva su regla y además necesita una Cabina libre', async () => {
        t.bookings.findById.mockResolvedValue({
          ...BOOKED,
          cabinId: BOX.id,
          employeeChosen: true,
        });

        await patch({ startsAt: NEW_START }).expect(200);

        expect(t.bookings.reschedule).toHaveBeenCalledWith(
          BOOKED.id,
          expect.objectContaining({
            employeeId: ANAS_EMPLOYEE.id,
            cabinId: BOX.id,
          }),
          expect.any(Date),
        );
      });

      it('muestra la Cabina en la respuesta', async () => {
        t.bookings.reschedule.mockResolvedValue({
          ...BOOKED,
          cabinId: BOX.id,
          cabin: BOX,
        });

        const res = await patch({ startsAt: NEW_START }).expect(200);

        expect(res.body.cabin).toEqual(BOX);
        expect(res.body).not.toHaveProperty('cabinId');
      });
    });

    it('answers 422 when the new horario overlaps another Turno of the only Empleado', async () => {
      t.bookings.listOccupiedByUser.mockResolvedValue([
        { prepStartsAt: new Date(NEW_START), endsAt: new Date('2026-01-02T15:30:00.000Z') },
      ]);

      await patch({ startsAt: NEW_START }).expect(422);
      expect(t.bookings.reschedule).not.toHaveBeenCalled();
    });

    describe('con varios Empleados', () => {
      const JUAN = {
        id: ANAS_EMPLOYEE.id + 1,
        name: 'Juan',
        availabilityId: 11,
        userId: ANAS_EMPLOYEE.userId + 1,
        imageUrl: null,
        slug: null,
      };
      const busyAtNewStart = [
        { prepStartsAt: new Date(NEW_START), endsAt: new Date('2026-01-02T15:30:00.000Z') },
      ];

      beforeEach(() => {
        t.services.findById.mockResolvedValue({
          ...ANAS_SERVICE,
          employees: [...ANAS_SERVICE.employees, JUAN],
        });
      });

      it('cambia de Empleado si el original no está libre en el horario nuevo', async () => {
        t.bookings.listOccupiedByUser.mockImplementation(async (userId) =>
          userId === ANAS_EMPLOYEE.userId ? busyAtNewStart : [],
        );

        await patch({ startsAt: NEW_START }).expect(200);

        expect(t.bookings.reschedule).toHaveBeenCalledWith(
          BOOKED.id,
          expect.objectContaining({ employeeId: JUAN.id }),
          expect.any(Date),
        );
      });

      it('conserva al Empleado original si está libre, aunque otro lleve más tiempo sin recibir un Turno', async () => {
        t.bookings.lastReceivedByEmployee.mockResolvedValue(
          new Map([[ANAS_EMPLOYEE.id, new Date('2026-01-01T10:00:00.000Z')]]),
        );

        await patch({ startsAt: NEW_START }).expect(200);

        expect(t.bookings.reschedule).toHaveBeenCalledWith(
          BOOKED.id,
          expect.objectContaining({ employeeId: ANAS_EMPLOYEE.id }),
          expect.any(Date),
        );
      });

      describe('con Empleado elegido', () => {
        beforeEach(() => {
          t.bookings.findById.mockResolvedValue({ ...BOOKED, employeeChosen: true });
        });

        it('se queda con su Empleado a un horario en el que está libre', async () => {
          t.bookings.lastReceivedByEmployee.mockResolvedValue(
            new Map([[ANAS_EMPLOYEE.id, new Date('2026-01-01T10:00:00.000Z')]]),
          );

          await patch({ startsAt: NEW_START }).expect(200);

          expect(t.bookings.reschedule).toHaveBeenCalledWith(
            BOOKED.id,
            expect.objectContaining({ employeeId: ANAS_EMPLOYEE.id }),
            expect.any(Date),
          );
        });

        it('a un horario donde solo otro Empleado está libre responde 422 y no lo mueve', async () => {
          t.bookings.listOccupiedByUser.mockImplementation(async (userId) =>
            userId === ANAS_EMPLOYEE.userId ? busyAtNewStart : [],
          );

          const res = await patch({ startsAt: NEW_START }).expect(422);

          expect(res.body.message).toBe(
            `Slot ${NEW_START} is not available for Service ${ANAS_SERVICE.id}`,
          );
          expect(t.bookings.reschedule).not.toHaveBeenCalled();
        });

        it('si su Empleado dejó de Ofrecer el Servicio responde 422', async () => {
          t.services.findById.mockResolvedValue({
            ...ANAS_SERVICE,
            employees: [JUAN],
          });

          await patch({ startsAt: NEW_START }).expect(422);
          expect(t.bookings.reschedule).not.toHaveBeenCalled();
        });
      });
    });

    it('answers 409 when the database catches the overlap in a race', async () => {
      t.bookings.reschedule.mockRejectedValue(new ConflictError('Overlaps'));

      await patch({ startsAt: NEW_START }).expect(409);
    });

    it.each([
      ['a day the Empleado does not work', '2026-01-03T15:00:00.000Z'],
      ['a time outside the Franjas', '2026-01-02T22:00:00.000Z'],
      ["a time off the Servicio's start grid", '2026-01-02T15:07:00.000Z'],
    ])('answers 422 for %s', async (_name, startsAt) => {
      const res = await patch({ startsAt }).expect(422);

      expect(res.body.message).toBe(
        `Slot ${startsAt} is not available for Service ${ANAS_SERVICE.id}`,
      );
      expect(t.bookings.reschedule).not.toHaveBeenCalled();
    });

    it.each([BookingStatus.PENDING, BookingStatus.CANCELLED])(
      'answers 422 when the Turno is %s',
      async (status) => {
        t.bookings.findById.mockResolvedValue({ ...BOOKED, status });

        await patch({ startsAt: NEW_START }).expect(422);
      },
    );

    it('answers 403 for a Usuario who is not the assigned Empleado', async () => {
      await patch({ startsAt: NEW_START }, OTHER_CLERK_TOKEN).expect(403);
    });

    it('rejects a missing or malformed startsAt with 400', async () => {
      await patch({}).expect(400);
      await patch({ startsAt: 'mañana' }).expect(400);
    });

    it('answers 401 without a Sesión', async () => {
      await patch({ startsAt: NEW_START }, '').expect(401);
    });
  });

  describe('PATCH /bookings/:id/no-show', () => {
    const patch = (token: string | undefined = CLERK_TOKEN) => {
      const req = t.http.patch(`/bookings/${BOOKED.id}/no-show`);
      return token ? req.set(bearer(token)) : req;
    };
    const HOUR_MS = 60 * 60 * 1000;

    it('answers 422 before the Turno ends', async () => {
      t.bookings.findById.mockResolvedValue({
        ...BOOKED,
        startsAt: new Date('2026-01-01T12:00:00.000Z'),
        endsAt: new Date('2026-01-01T12:30:00.000Z'),
      });

      await patch().expect(422);
      expect(t.bookings.markNoShow).not.toHaveBeenCalled();
    });

    it('saves noShowAt with the current time once the Turno has ended', async () => {
      t.clock.advance(HOUR_MS);
      t.bookings.findById.mockResolvedValue({
        ...BOOKED,
        startsAt: new Date('2026-01-01T12:00:00.000Z'),
        endsAt: new Date('2026-01-01T12:30:00.000Z'),
      });
      t.bookings.markNoShow.mockResolvedValue({
        ...BOOKED,
        noShowAt: new Date('2026-01-01T13:00:00.000Z'),
      });

      const res = await patch().expect(200);

      expect(t.bookings.markNoShow).toHaveBeenCalledWith(
        BOOKED.id,
        new Date('2026-01-01T13:00:00.000Z'),
      );
      expect(res.body).toMatchObject({
        id: BOOKED.id,
        status: 'BOOKED',
        noShowAt: '2026-01-01T13:00:00.000Z',
      });
    });

    it('answers 422 when the Turno has an Employee no-show', async () => {
      t.clock.advance(3 * 24 * HOUR_MS);
      t.bookings.findById.mockResolvedValue({
        ...BOOKED,
        employeeNoShowAt: new Date('2026-01-02T16:00:00.000Z'),
      });

      const res = await patch().expect(422);

      expect(res.body.message).toBe('Turno has an Employee no-show');
      expect(t.bookings.markNoShow).not.toHaveBeenCalled();
    });

    it('answers 422 when the Turno already has an Ausencia del Invitado', async () => {
      t.clock.advance(3 * 24 * HOUR_MS);
      t.bookings.findById.mockResolvedValue({
        ...BOOKED,
        noShowAt: new Date('2026-01-02T16:00:00.000Z'),
      });

      await patch().expect(422);
      expect(t.bookings.markNoShow).not.toHaveBeenCalled();
    });

    it.each([BookingStatus.PENDING, BookingStatus.CANCELLED])(
      'answers 422 when the Turno is %s',
      async (status) => {
        t.clock.advance(3 * 24 * HOUR_MS);
        t.bookings.findById.mockResolvedValue({ ...BOOKED, status });

        await patch().expect(422);
      },
    );

    it('answers 403 for a Usuario who is not the assigned Empleado', async () => {
      t.clock.advance(3 * 24 * HOUR_MS);

      await patch(OTHER_CLERK_TOKEN).expect(403);
    });

    it('answers 401 without a Sesión', async () => {
      await patch('').expect(401);
    });
  });

  describe('DELETE /bookings/:id/no-show', () => {
    const del = (token: string | undefined = CLERK_TOKEN) => {
      const req = t.http.delete(`/bookings/${BOOKED.id}/no-show`);
      return token ? req.set(bearer(token)) : req;
    };
    const MARKED = { ...BOOKED, noShowAt: new Date('2026-01-01T13:00:00.000Z') };

    it('clears noShowAt and answers the Turno', async () => {
      t.bookings.findById.mockResolvedValue(MARKED);
      t.bookings.unmarkNoShow.mockResolvedValue({ ...BOOKED, noShowAt: null });

      const res = await del().expect(200);

      expect(t.bookings.unmarkNoShow).toHaveBeenCalledWith(BOOKED.id);
      expect(res.body).toMatchObject({ id: BOOKED.id, status: 'BOOKED', noShowAt: null });
    });

    it('answers 422 when the Turno has no Ausencia', async () => {
      t.bookings.findById.mockResolvedValue(BOOKED);

      const res = await del().expect(422);

      expect(res.body.message).toBe('Turno has no Ausencia');
      expect(t.bookings.unmarkNoShow).not.toHaveBeenCalled();
    });

    it('answers 404 when the Turno does not exist', async () => {
      t.bookings.findById.mockRejectedValue(new NotFoundError('Booking 1 not found'));

      await del().expect(404);
    });

    it('answers 403 for a Usuario who is not the assigned Empleado', async () => {
      t.bookings.findById.mockResolvedValue(MARKED);

      await del(OTHER_CLERK_TOKEN).expect(403);
      expect(t.bookings.unmarkNoShow).not.toHaveBeenCalled();
    });

    it('answers 401 without a Sesión', async () => {
      await del('').expect(401);
    });
  });
});
