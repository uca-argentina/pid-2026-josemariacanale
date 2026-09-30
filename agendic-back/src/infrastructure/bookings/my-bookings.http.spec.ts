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
} from '../../test-app';

const BOOKED: Booking = {
  id: 7,
  serviceId: ANAS_SERVICE.id,
  employeeId: ANAS_EMPLOYEE.id,
  clientName: 'Carla Gómez',
  clientEmail: 'carla@example.com',
  startsAt: new Date('2026-01-02T14:00:00.000Z'), // Friday 11:00 ARG
  endsAt: new Date('2026-01-02T14:30:00.000Z'),
  status: BookingStatus.BOOKED,
  notes: null,
  noShowAt: null,
};

const AVAILABILITY: Availability = {
  id: 10,
  employeeId: ANAS_EMPLOYEE.id,
  name: 'Horario general',
  isDefault: true,
  intervals: [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startTime: '09:00',
    endTime: '18:00',
  })),
};

describe('Mis turnos del Empleado', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    scriptOtherSession(t);
    t.bookings.findById.mockResolvedValue(BOOKED);
    t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);
  });
  afterEach(() => t.app.close());

  describe('GET /employees/me/bookings', () => {
    const employeeBooking = (
      id: number,
      employeeId: number,
      businessId: number,
      branchName: string,
    ) => ({
      ...BOOKED,
      id,
      employeeId,
      serviceName: 'Haircut',
      businessId,
      businessName: `Negocio ${businessId}`,
      branchId: businessId * 10,
      branchName,
    });

    it('lists the Turnos of every Negocio where the Usuario is an active Empleado', async () => {
      t.employees.listActiveByUser.mockResolvedValue([
        ANAS_EMPLOYEE,
        { ...ANAS_EMPLOYEE, id: 2, businessId: 2 },
      ]);
      t.bookings.listByEmployees.mockResolvedValue([
        employeeBooking(1, 1, 1, 'Downtown'),
        employeeBooking(2, 2, 2, 'Uptown'),
      ]);

      const res = await t.http
        .get('/employees/me/bookings')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.bookings.listByEmployees).toHaveBeenCalledWith([1, 2]);
      expect(res.body).toEqual([
        {
          id: 1,
          status: 'BOOKED',
          startsAt: BOOKED.startsAt.toISOString(),
          endsAt: BOOKED.endsAt.toISOString(),
          clientName: 'Carla Gómez',
          clientEmail: 'carla@example.com',
          noShowAt: null,
          serviceId: ANAS_SERVICE.id,
          serviceName: 'Haircut',
          businessId: 1,
          businessName: 'Negocio 1',
          branchId: 10,
          branchName: 'Downtown',
        },
        expect.objectContaining({
          id: 2,
          businessId: 2,
          branchName: 'Uptown',
        }),
      ]);
    });

    it('answers 200 with an empty list when the Usuario is no active Empleado', async () => {
      t.employees.listActiveByUser.mockResolvedValue([]);

      const res = await t.http
        .get('/employees/me/bookings')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual([]);
      expect(t.bookings.listByEmployees).not.toHaveBeenCalled();
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.get('/employees/me/bookings').expect(401);
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
      t.bookings.hasOverlappingOccupied.mockResolvedValue(false);
      t.services.findById.mockResolvedValue(ANAS_SERVICE);
      t.services.findEmployeeLink.mockResolvedValue({
        serviceId: ANAS_SERVICE.id,
        employeeId: ANAS_EMPLOYEE.id,
        availabilityId: AVAILABILITY.id,
      });
      t.branches.findById.mockResolvedValue(ANAS_BRANCH);
      t.availabilities.findById.mockResolvedValue(AVAILABILITY);
      t.overrides.listByEmployee.mockResolvedValue([]);
      t.bookings.listOccupiedByEmployee.mockResolvedValue([]);
      t.bookings.reschedule.mockResolvedValue({
        ...BOOKED,
        startsAt: new Date(NEW_START),
        endsAt: new Date('2026-01-02T15:30:00.000Z'),
      });
    });

    it('moves a BOOKED Turno to another Horario reservable, keeping its duration and BOOKED', async () => {
      const res = await patch({ startsAt: NEW_START }).expect(200);

      expect(t.bookings.reschedule).toHaveBeenCalledWith(
        BOOKED.id,
        new Date(NEW_START),
        new Date('2026-01-02T15:30:00.000Z'),
      );
      expect(t.bookings.listOccupiedByEmployee).toHaveBeenCalledWith(
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

    it('answers 409 when the new horario overlaps another Turno of the Empleado', async () => {
      t.bookings.hasOverlappingOccupied.mockResolvedValue(true);

      await patch({ startsAt: NEW_START }).expect(409);
      expect(t.bookings.hasOverlappingOccupied).toHaveBeenCalledWith(
        ANAS_EMPLOYEE.id,
        new Date(NEW_START),
        new Date('2026-01-02T15:30:00.000Z'),
        BOOKED.id,
      );
      expect(t.bookings.reschedule).not.toHaveBeenCalled();
    });

    it('answers 409 when the database catches the overlap in a race', async () => {
      t.bookings.reschedule.mockRejectedValue(new ConflictError('Overlaps'));

      await patch({ startsAt: NEW_START }).expect(409);
    });

    it.each([
      ['a day the Empleado does not work', '2026-01-03T15:00:00.000Z'],
      ['a time outside the Franjas', '2026-01-02T22:00:00.000Z'],
      ['a time off the 15-minute grid', '2026-01-02T15:07:00.000Z'],
    ])('answers 422 for %s', async (_name, startsAt) => {
      await patch({ startsAt }).expect(422);
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
