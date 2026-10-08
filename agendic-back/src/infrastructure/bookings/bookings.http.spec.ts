import { Availability } from '../../domain/availabilities/availability';
import { Booking, BookingStatus } from '../../domain/bookings/booking';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  TooManyRequestsError,
} from '../../domain/errors';
import {
  ANAS_BRANCH,
  ANAS_BUSINESS,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  bearer,
  createTestApp,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  CLERK_TOKEN,
  TestApp,
  workWeek,
} from '../../test-app';

const BRANCH = ANAS_BRANCH;
const SERVICE = ANAS_SERVICE;

/** Monday to Friday, 09:00–18:00 in the Sucursal's zone: the Horarios reservables Reservar recalculates. */
const AVAILABILITY: Availability = {
  id: 10,
  userId: ANAS_EMPLOYEE.userId,
  name: 'Horas laborables',
  timeZone: BRANCH.timeZone,
  isDefault: true,
  schedule: workWeek('09:00', '18:00'),
  overrides: [],
};

const VALID_BOOKING = {
  serviceId: SERVICE.id,
  startsAt: '2026-01-01T12:00:00.000Z', // 09:00 in America/Argentina/Buenos_Aires: opening time
  clientName: 'Bruno Díaz',
  clientEmail: 'bruno@example.com',
  code: 'A2B3C4',
};

const BOOKING: Booking = {
  id: 1,
  serviceId: SERVICE.id,
  employeeId: ANAS_EMPLOYEE.id,
  userId: ANAS_EMPLOYEE.userId,
  clientName: VALID_BOOKING.clientName,
  clientEmail: VALID_BOOKING.clientEmail,
  prepStartsAt: new Date(VALID_BOOKING.startsAt),
  startsAt: new Date(VALID_BOOKING.startsAt),
  endsAt: new Date('2026-01-01T12:30:00.000Z'),
  status: BookingStatus.BOOKED,
  notes: null,
  noShowAt: null,
  link: 'booking-link-secret',
};

describe('Turno', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('POST /bookings/code', () => {
    it('sends a verification code and answers 204', async () => {
      t.bookingCodes.request.mockReturnValue('A2B3C4');

      await t.http
        .post('/bookings/code')
        .send({ email: 'Bruno@Example.COM' })
        .expect(204);

      expect(t.bookingCodes.request).toHaveBeenCalledWith('bruno@example.com');
      expect(t.mailer.sendVerificationCode).toHaveBeenCalledWith(
        'bruno@example.com',
        'A2B3C4',
      );
    });

    it('answers 429 after too many requests for the same email', async () => {
      t.bookingCodes.request.mockImplementation(() => {
        throw new TooManyRequestsError(
          'Too many verification codes requested for bruno@example.com',
        );
      });

      const res = await t.http
        .post('/bookings/code')
        .send({ email: 'bruno@example.com' })
        .expect(429);
      expect(res.body.message).toBe(
        'Too many verification codes requested for bruno@example.com',
      );
    });

    it('answers 400 for a malformed email', async () => {
      await t.http.post('/bookings/code').send({ email: 'not-an-email' }).expect(400);
      expect(t.bookingCodes.request).not.toHaveBeenCalled();
    });
  });

  describe('POST /bookings', () => {
    beforeEach(() => {
      t.services.findById.mockResolvedValue(SERVICE);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.availabilities.findById.mockResolvedValue(AVAILABILITY);
      t.bookings.listOccupiedByUser.mockResolvedValue([]);
      t.bookings.lastReceivedByEmployee.mockResolvedValue(new Map());
      t.bookings.create.mockResolvedValue(BOOKING);
    });

    it('books the Turno as BOOKED, without a Sesión, verifying the code', async () => {
      const res = await t.http.post('/bookings').send(VALID_BOOKING).expect(201);

      expect(res.body).toEqual({
        id: BOOKING.id,
        serviceId: BOOKING.serviceId,
        employeeId: BOOKING.employeeId,
        startsAt: BOOKING.startsAt.toISOString(),
        endsAt: BOOKING.endsAt.toISOString(),
        status: 'BOOKED',
        notes: null,
        employeeName: ANAS_EMPLOYEE.name,
        link: BOOKING.link,
      });
      expect(t.bookingCodes.verify).toHaveBeenCalledWith(
        VALID_BOOKING.clientEmail,
        VALID_BOOKING.code,
      );
      expect(t.bookings.create).toHaveBeenCalledWith(
        {
          serviceId: SERVICE.id,
          employeeId: ANAS_EMPLOYEE.id,
          userId: ANAS_EMPLOYEE.userId,
          clientName: VALID_BOOKING.clientName,
          clientEmail: VALID_BOOKING.clientEmail,
          prepStartsAt: new Date(VALID_BOOKING.startsAt),
          startsAt: new Date(VALID_BOOKING.startsAt),
          endsAt: new Date('2026-01-01T12:30:00.000Z'),
          notes: null,
          status: BookingStatus.BOOKED,
        },
        undefined,
      );
      expect(t.mailer.sendBookingConfirmation).toHaveBeenCalledWith(
        VALID_BOOKING.clientEmail,
        BOOKING.link,
      );
    });

    it('leaves the Turno PENDING when the Servicio requires approval', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, requiresApproval: true });
      t.bookings.create.mockResolvedValue({ ...BOOKING, status: BookingStatus.PENDING });

      const res = await t.http.post('/bookings').send(VALID_BOOKING).expect(201);

      expect(res.body).toMatchObject({ status: 'PENDING' });
      expect(t.bookings.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: BookingStatus.PENDING }),
        undefined,
      );
    });

    it('answers 400 for an invalid or expired verification code', async () => {
      t.bookingCodes.verify.mockReturnValue(false);

      const res = await t.http.post('/bookings').send(VALID_BOOKING).expect(400);

      expect(res.body.message).toBe(
        `Invalid or expired verification code for ${VALID_BOOKING.clientEmail}`,
      );
      expect(t.bookings.create).not.toHaveBeenCalled();
    });

    it('holds the Empleado from the Tiempo de preparación on', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, prepMinutes: 15 });

      await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, startsAt: '2026-01-01T13:00:00.000Z' })
        .expect(201);

      expect(t.bookings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          prepStartsAt: new Date('2026-01-01T12:45:00.000Z'),
          startsAt: new Date('2026-01-01T13:00:00.000Z'),
        }),
        undefined,
      );
    });

    it('answers 422 when the slot collides with the Tiempo de preparación of another Turno', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, prepMinutes: 15 });
      t.bookings.listOccupiedByUser.mockResolvedValue([
        { prepStartsAt: new Date('2026-01-01T12:45:00.000Z'), endsAt: new Date('2026-01-01T13:30:00.000Z') },
      ]);

      await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, startsAt: '2026-01-01T13:00:00.000Z' })
        .expect(422);
      expect(t.bookings.create).not.toHaveBeenCalled();
    });

    it('creates with the Límite diario guard, counted in the Sucursal time zone', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, dailyLimit: 2 });
      t.bookings.listOccupiedStartsByService.mockResolvedValue([]);

      await t.http.post('/bookings').send(VALID_BOOKING).expect(201);

      // 2026-01-01 in Buenos Aires (UTC-3): from 03:00Z to 03:00Z of the next day.
      expect(t.bookings.create).toHaveBeenCalledWith(
        expect.anything(),
        {
          serviceId: SERVICE.id,
          limit: 2,
          from: new Date('2026-01-01T03:00:00.000Z'),
          to: new Date('2026-01-02T03:00:00.000Z'),
        },
      );
    });

    it('answers 409 when the repository finds the Límite diario reached', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, dailyLimit: 1 });
      t.bookings.listOccupiedStartsByService.mockResolvedValue([]);
      t.bookings.create.mockRejectedValue(
        new ConflictError('The Service reached its Límite diario that day'),
      );

      const res = await t.http.post('/bookings').send(VALID_BOOKING).expect(409);

      expect(res.body.message).toBe(
        'The Service reached its Límite diario that day',
      );
    });

    it('books a Turno for a Servicio oculto just the same', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, hidden: true });

      await t.http.post('/bookings').send(VALID_BOOKING).expect(201);
      expect(t.bookings.create).toHaveBeenCalled();
    });

    it('trims the name and trims and lowercases the email', async () => {
      await t.http
        .post('/bookings')
        .send({
          ...VALID_BOOKING,
          clientName: '  Bruno  ',
          clientEmail: '  Bruno@Example.COM ',
        })
        .expect(201);

      expect(t.bookings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientName: 'Bruno',
          clientEmail: 'bruno@example.com',
        }),
        undefined,
      );
    });

    it('keeps the Comentario del Turno, trimmed, and returns it', async () => {
      t.bookings.create.mockResolvedValue({ ...BOOKING, notes: 'Llego 5 minutos tarde' });

      const res = await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, notes: '  Llego 5 minutos tarde ' })
        .expect(201);

      expect(t.bookings.create).toHaveBeenCalledWith(
        expect.objectContaining({ notes: 'Llego 5 minutos tarde' }),
        undefined,
      );
      expect(res.body.notes).toBe('Llego 5 minutos tarde');
    });

    it('keeps no Comentario del Turno when it is blank', async () => {
      await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, notes: '   ' })
        .expect(201);

      expect(t.bookings.create).toHaveBeenCalledWith(
        expect.objectContaining({ notes: null }),
        undefined,
      );
    });

    it('accepts a Comentario del Turno of exactly 500 characters', async () => {
      await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, notes: 'a'.repeat(500) })
        .expect(201);
    });

    it('accepts a Turno ending exactly at the end of the Franja', async () => {
      await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, startsAt: '2026-01-01T20:30:00.000Z' }) // 17:30 ARG, ends 18:00 ARG
        .expect(201);
    });

    it('answers 422 for a Turno starting before now', async () => {
      await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, startsAt: '2026-01-01T11:59:59.000Z' })
        .expect(422);

      expect(t.bookings.create).not.toHaveBeenCalled();
    });

    it('answers 422 for a Turno before the Franja starts', async () => {
      await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, startsAt: '2026-01-02T10:00:00.000Z' }) // 07:00 ARG, after now but before the Franja
        .expect(422);

      expect(t.bookings.create).not.toHaveBeenCalled();
    });

    it('answers 422 for a Turno that is not a Horario reservable', async () => {
      const res = await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, startsAt: '2026-01-01T20:45:00.000Z' }) // 17:45 ARG: ends after the Franja and is off the 30' grid
        .expect(422);

      expect(res.body.message).toBe(
        `Slot 2026-01-01T20:45:00.000Z is not available for Service ${SERVICE.id}`,
      );

      expect(t.bookings.create).not.toHaveBeenCalled();
    });

    it('answers 422 for an unknown Servicio', async () => {
      t.services.findById.mockResolvedValue(null);

      await t.http.post('/bookings').send(VALID_BOOKING).expect(422);
      expect(t.bookings.create).not.toHaveBeenCalled();
    });

    it('answers 422 for a Servicio dado de baja', async () => {
      t.services.findById.mockResolvedValue({
        ...SERVICE,
        retiredAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await t.http.post('/bookings').send(VALID_BOOKING).expect(422);
      expect(t.bookings.create).not.toHaveBeenCalled();
    });

    it('answers 422 when nobody is free at that time', async () => {
      t.bookings.listOccupiedByUser.mockResolvedValue([
        { prepStartsAt: BOOKING.startsAt, endsAt: BOOKING.endsAt },
      ]);

      const res = await t.http.post('/bookings').send(VALID_BOOKING).expect(422);

      expect(res.body.message).toBe(
        `Slot ${VALID_BOOKING.startsAt} is not available for Service ${SERVICE.id}`,
      );
      expect(t.bookings.create).not.toHaveBeenCalled();
    });

    describe('con varios Empleados', () => {
      const JUAN = {
        id: ANAS_EMPLOYEE.id + 1,
        name: 'Juan',
        availabilityId: 11,
        userId: ANAS_EMPLOYEE.userId + 1,
      };

      beforeEach(() => {
        t.services.findById.mockResolvedValue({
          ...SERVICE,
          employees: [...SERVICE.employees, JUAN],
        });
        t.availabilities.findById.mockResolvedValue(AVAILABILITY);
        t.bookings.create.mockImplementation(async (data) => ({
          ...BOOKING,
          employeeId: data.employeeId,
          status: data.status,
        }));
      });

      const employeeOfCreatedBooking = () =>
        t.bookings.create.mock.calls[0][0].employeeId;

      it('asigna el que hace más tiempo que no recibe un Turno del Servicio', async () => {
        t.bookings.lastReceivedByEmployee.mockResolvedValue(
          new Map([
            [ANAS_EMPLOYEE.id, new Date('2026-01-01T10:00:00.000Z')],
            [JUAN.id, new Date('2026-01-01T09:00:00.000Z')],
          ]),
        );

        const res = await t.http.post('/bookings').send(VALID_BOOKING).expect(201);

        expect(employeeOfCreatedBooking()).toBe(JUAN.id);
        expect(res.body.employeeName).toBe('Juan');
      });

      it('sin Turnos previos gana el que nunca recibió uno', async () => {
        t.bookings.lastReceivedByEmployee.mockResolvedValue(
          new Map([[ANAS_EMPLOYEE.id, new Date('2026-01-01T10:00:00.000Z')]]),
        );

        await t.http.post('/bookings').send(VALID_BOOKING).expect(201);

        expect(employeeOfCreatedBooking()).toBe(JUAN.id);
      });

      it('si empatan, el de menor id', async () => {
        await t.http.post('/bookings').send(VALID_BOOKING).expect(201);

        expect(employeeOfCreatedBooking()).toBe(ANAS_EMPLOYEE.id);
      });

      it('un horario en el que solo uno está libre se le asigna a ese', async () => {
        t.bookings.listOccupiedByUser.mockImplementation(async (userId) =>
          userId === JUAN.userId
            ? []
            : [{ prepStartsAt: BOOKING.startsAt, endsAt: BOOKING.endsAt }],
        );
        t.bookings.lastReceivedByEmployee.mockResolvedValue(
          new Map([[JUAN.id, new Date('2026-01-01T10:00:00.000Z')]]),
        );

        await t.http.post('/bookings').send(VALID_BOOKING).expect(201);

        expect(employeeOfCreatedBooking()).toBe(JUAN.id);
      });
    });

    it.each([
      ['a blank clientName', { clientName: ' ' }],
      ['a missing clientName', { clientName: undefined }],
      ['a malformed clientEmail', { clientEmail: 'bruno@' }],
      ['a missing clientEmail', { clientEmail: undefined }],
      ['a malformed startsAt', { startsAt: 'not-a-date' }],
      ['a missing startsAt', { startsAt: undefined }],
      ['a missing serviceId', { serviceId: undefined }],
      ['a Comentario del Turno over 500 characters', { notes: 'a'.repeat(501) }],
      ['a non-string Comentario del Turno', { notes: 42 }],
      ['a null Comentario del Turno', { notes: null }],
      ['a missing code', { code: undefined }],
    ])('rejects %s with 400, without reaching the repository', async (_, override) => {
      await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, ...override })
        .expect(400);

      expect(t.bookings.create).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ['accept', BookingStatus.BOOKED],
    ['reject', BookingStatus.REJECTED],
  ] as const)('PATCH /bookings/:id/%s', (action, status) => {
    const PENDING: Booking = { ...BOOKING, status: BookingStatus.PENDING };
    const patch = (token?: string) => {
      const req = t.http.patch(`/bookings/${BOOKING.id}/${action}`);
      return token ? req.set(bearer(token)) : req;
    };

    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.bookings.findById.mockResolvedValue(PENDING);
      t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);
      t.bookings.resolvePending.mockResolvedValue({ ...PENDING, status });
    });

    it(`moves a PENDING Turno to ${status} for the assigned Empleado`, async () => {
      const res = await patch(CLERK_TOKEN).expect(200);

      expect(t.bookings.resolvePending).toHaveBeenCalledWith(BOOKING.id, status);
      expect(res.body).toMatchObject({ id: BOOKING.id, status });
    });

    it('answers 422 when the Turno is not PENDING', async () => {
      t.bookings.findById.mockResolvedValue(BOOKING);

      await patch(CLERK_TOKEN).expect(422);
      expect(t.bookings.resolvePending).not.toHaveBeenCalled();
    });

    it('answers 422 when it stopped being PENDING meanwhile', async () => {
      t.bookings.resolvePending.mockRejectedValue(
        new BusinessRuleError('Turno is not pending'),
      );

      await patch(CLERK_TOKEN).expect(422);
    });

    it('answers 403 for a Usuario who is not the assigned Empleado', async () => {
      await patch(OTHER_CLERK_TOKEN).expect(403);
      expect(t.bookings.resolvePending).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Turno', async () => {
      t.bookings.findById.mockRejectedValue(new NotFoundError('Booking not found'));

      await patch(CLERK_TOKEN).expect(404);
    });

    it('answers 401 without a Sesión', async () => {
      await patch().expect(401);
    });
  });

  describe('GET /businesses/:id/bookings', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.bookings.listByBusiness.mockResolvedValue([BOOKING]);
    });

    it("lists every Turno of the Negocio, with the Cliente's name, email and status, for the Dueño", async () => {
      const res = await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/bookings`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual([
        {
          id: BOOKING.id,
          serviceId: BOOKING.serviceId,
          employeeId: BOOKING.employeeId,
          startsAt: BOOKING.startsAt.toISOString(),
          endsAt: BOOKING.endsAt.toISOString(),
          status: BOOKING.status,
          notes: BOOKING.notes,
          clientName: BOOKING.clientName,
          clientEmail: BOOKING.clientEmail,
        },
      ]);
    });

    it('shows a cascaded Turno as CANCELLED', async () => {
      t.bookings.listByBusiness.mockResolvedValue([
        { ...BOOKING, status: BookingStatus.CANCELLED },
      ]);

      const res = await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/bookings`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toMatchObject([{ status: 'CANCELLED' }]);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.get(`/businesses/${ANAS_BUSINESS.id}/bookings`).expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/bookings`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);
    });

    it('answers 404 for an unknown Negocio', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http
        .get('/businesses/999/bookings')
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });
  });

  it('GET /me/bookings does not exist', async () => {
    scriptSession(t);

    await t.http.get('/me/bookings').set(bearer(CLERK_TOKEN)).expect(404);
  });
});
