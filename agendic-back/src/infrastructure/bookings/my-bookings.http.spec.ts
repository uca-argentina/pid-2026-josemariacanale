import { Availability } from '../../domain/availabilities/availability';
import { Booking, BookingStatus } from '../../domain/bookings/booking';
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
  clientName: 'Carla Gómez',
  clientEmail: 'carla@example.com',
  prepStartsAt: new Date('2026-01-02T13:50:00.000Z'),
  startsAt: new Date('2026-01-02T14:00:00.000Z'), // Friday 11:00 ARG
  endsAt: new Date('2026-01-02T14:30:00.000Z'),
  status: BookingStatus.BOOKED,
  notes: null,
  noShowAt: null,
  link: 'booking-link-secret',
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
          id: 1,
          serviceName: 'Haircut',
          business: { id: 1, name: 'Negocio 1' },
          branch: { id: 10, name: 'Downtown' },
        },
        {
          ...BOOKED,
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
          serviceId: ANAS_SERVICE.id,
          serviceName: 'Haircut',
          business: { id: 1, name: 'Negocio 1' },
          branch: { id: 10, name: 'Downtown' },
        },
        expect.objectContaining({
          id: 2,
          employeeId: null,
          business: null,
          branch: null,
        }),
      ]);
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

      expect(t.bookings.cancel).toHaveBeenCalledWith(BOOKED.id);
      expect(res.body).toMatchObject({ id: BOOKED.id, status: 'CANCELLED' });
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
        prepStartsAt: new Date('2026-01-02T14:45:00.000Z'),
        startsAt: new Date(NEW_START),
        endsAt: new Date('2026-01-02T15:30:00.000Z'),
      });
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
        );
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

    it('answers 422 when the Turno already has an Ausencia', async () => {
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
});
