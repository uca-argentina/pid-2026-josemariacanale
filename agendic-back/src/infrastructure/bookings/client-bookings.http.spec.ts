import { Availability } from '../../domain/availabilities/availability';
import { Booking, BookingStatus, ClientBooking } from '../../domain/bookings/booking';
import { ConflictError, NotFoundError } from '../../domain/errors';
import {
  ANAS_BRANCH,
  ANAS_BUSINESS,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  createTestApp,
  TestApp,
  workWeek,
} from '../../test-app';

const EMAIL = 'carla@example.com';

const BOOKED: Booking = {
  id: 7,
  serviceId: ANAS_SERVICE.id,
  employeeId: ANAS_EMPLOYEE.id,
  userId: ANAS_EMPLOYEE.userId,
  clientName: 'Carla Gómez',
  clientEmail: EMAIL,
  prepStartsAt: new Date('2026-01-02T13:50:00.000Z'),
  startsAt: new Date('2026-01-02T14:00:00.000Z'), // Friday 11:00 ARG
  endsAt: new Date('2026-01-02T14:30:00.000Z'),
  status: BookingStatus.BOOKED,
  notes: null,
  noShowAt: null,
  link: 'booking-link-secret',
};

const CLIENT_BOOKED: ClientBooking = {
  ...BOOKED,
  timeZone: ANAS_BRANCH.timeZone,
  employeeName: ANAS_EMPLOYEE.name,
  service: {
    name: ANAS_SERVICE.name,
    durationMinutes: ANAS_SERVICE.durationMinutes,
    price: ANAS_SERVICE.price,
    depositPercent: ANAS_SERVICE.depositPercent,
  },
  business: { name: ANAS_BUSINESS.name, slug: ANAS_BUSINESS.slug },
  branch: {
    name: ANAS_BRANCH.name,
    slug: ANAS_BRANCH.slug,
    address: ANAS_BRANCH.address,
    coverUrl: null,
  },
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

describe('Mis turnos del Cliente', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
  });
  afterEach(() => t.app.close());

  describe('POST /client-access', () => {
    it('cambia un Código de verificación vigente por un acceso de 15 minutos', async () => {
      t.clientAccessTokens.sign.mockReturnValue({
        access: 'signed-access-token',
        expiresAt: new Date('2026-01-01T12:15:00.000Z'),
      });

      const res = await t.http
        .post('/client-access')
        .send({ email: 'Carla@Example.COM', code: 'A2B3C4' })
        .expect(200);

      expect(t.bookingCodes.verify).toHaveBeenCalledWith(
        'carla@example.com',
        'A2B3C4',
      );
      expect(t.clientAccessTokens.sign).toHaveBeenCalledWith('carla@example.com');
      expect(res.body).toEqual({
        access: 'signed-access-token',
        expiresAt: '2026-01-01T12:15:00.000Z',
      });
    });

    it('answers 400 for an invalid or expired code', async () => {
      t.bookingCodes.verify.mockReturnValue(false);

      const res = await t.http
        .post('/client-access')
        .send({ email: EMAIL, code: 'WRONG1' })
        .expect(400);

      expect(res.body.message).toBe(`Invalid or expired verification code for ${EMAIL}`);
      expect(t.clientAccessTokens.sign).not.toHaveBeenCalled();
    });

    it('rejects a malformed email with 400', async () => {
      await t.http
        .post('/client-access')
        .send({ email: 'not-an-email', code: 'A2B3C4' })
        .expect(400);
    });
  });

  describe('con un acceso vigente', () => {
    beforeEach(() => {
      t.clientAccessTokens.verify.mockImplementation((access) =>
        access === 'valid-access' ? EMAIL : null,
      );
    });

    describe('GET /client/bookings', () => {
      it("lista los Turnos del email, en cualquier Negocio o Servicio personal", async () => {
        t.bookings.findByClientEmail.mockResolvedValue([CLIENT_BOOKED]);

        const res = await t.http
          .get('/client/bookings')
          .set('X-Client-Access', 'valid-access')
          .expect(200);

        expect(t.bookings.findByClientEmail).toHaveBeenCalledWith(EMAIL);
        expect(res.body).toEqual([
          {
            id: CLIENT_BOOKED.id,
            status: 'BOOKED',
            startsAt: CLIENT_BOOKED.startsAt.toISOString(),
            endsAt: CLIENT_BOOKED.endsAt.toISOString(),
            timeZone: ANAS_BRANCH.timeZone,
            notes: null,
            clientName: CLIENT_BOOKED.clientName,
            serviceId: ANAS_SERVICE.id,
            employeeId: ANAS_EMPLOYEE.id,
            service: {
              name: ANAS_SERVICE.name,
              durationMinutes: ANAS_SERVICE.durationMinutes,
              price: ANAS_SERVICE.price,
              depositPercent: ANAS_SERVICE.depositPercent,
            },
            employeeName: ANAS_EMPLOYEE.name,
            business: { name: ANAS_BUSINESS.name, slug: ANAS_BUSINESS.slug },
            branch: {
              name: ANAS_BRANCH.name,
              slug: ANAS_BRANCH.slug,
              address: ANAS_BRANCH.address,
              coverUrl: null,
            },
          },
        ]);
      });

      it('answers null business and branch for a Servicio personal', async () => {
        t.bookings.findByClientEmail.mockResolvedValue([
          {
            ...CLIENT_BOOKED,
            employeeId: null,
            business: null,
            branch: null,
            timeZone: AVAILABILITY.timeZone,
          },
        ]);

        const res = await t.http
          .get('/client/bookings')
          .set('X-Client-Access', 'valid-access')
          .expect(200);

        expect(res.body).toMatchObject([{ business: null, branch: null }]);
      });

      it('answers 401 without the X-Client-Access header', async () => {
        await t.http.get('/client/bookings').expect(401);
      });

      it('answers 401 with an invalid access', async () => {
        await t.http
          .get('/client/bookings')
          .set('X-Client-Access', 'bogus')
          .expect(401);
      });
    });

    describe('PATCH /client/bookings/:id/cancel', () => {
      const patch = (access?: string) => {
        const req = t.http.patch(`/client/bookings/${BOOKED.id}/cancel`);
        return req.set('X-Client-Access', access ?? 'valid-access');
      };
      const withoutAccess = () => t.http.patch(`/client/bookings/${BOOKED.id}/cancel`);

      beforeEach(() => {
        t.bookings.findById.mockResolvedValue(BOOKED);
        t.bookings.cancelPendingOrBooked.mockResolvedValue({
          ...CLIENT_BOOKED,
          status: BookingStatus.CANCELLED,
        });
      });

      it('cancela un Turno BOOKED del Cliente', async () => {
        const res = await patch().expect(200);

        expect(t.bookings.cancelPendingOrBooked).toHaveBeenCalledWith(BOOKED.id);
        expect(res.body).toMatchObject({ id: BOOKED.id, status: 'CANCELLED' });
      });

      it('cancela un Turno PENDING del Cliente', async () => {
        t.bookings.findById.mockResolvedValue({ ...BOOKED, status: BookingStatus.PENDING });

        await patch().expect(200);

        expect(t.bookings.cancelPendingOrBooked).toHaveBeenCalledWith(BOOKED.id);
      });

      it.each([BookingStatus.REJECTED, BookingStatus.CANCELLED])(
        'answers 422 when the Turno is %s',
        async (status) => {
          t.bookings.findById.mockResolvedValue({ ...BOOKED, status });

          await patch().expect(422);
          expect(t.bookings.cancelPendingOrBooked).not.toHaveBeenCalled();
        },
      );

      it('answers 422 for a Turno that already started', async () => {
        t.clock.advance(BOOKED.startsAt.getTime() - t.clock.now().getTime());

        await patch().expect(422);
        expect(t.bookings.cancelPendingOrBooked).not.toHaveBeenCalled();
      });

      it('answers 404 for another email', async () => {
        t.bookings.findById.mockResolvedValue({ ...BOOKED, clientEmail: 'other@example.com' });

        const res = await patch().expect(404);
        expect(res.body.message).toBe(`Turno ${BOOKED.id} not found`);
      });

      it('answers 404 for an unknown Turno', async () => {
        t.bookings.findById.mockRejectedValue(new NotFoundError('Booking not found'));

        const res = await patch().expect(404);
        expect(res.body.message).toBe(`Turno ${BOOKED.id} not found`);
      });

      it('answers 401 without an access', async () => {
        await withoutAccess().expect(401);
      });
    });

    describe('PATCH /client/bookings/:id/reschedule', () => {
      const NEW_START = '2026-01-02T15:00:00.000Z'; // Friday 12:00 ARG
      const patch = (body: object, access?: string) =>
        t.http
          .patch(`/client/bookings/${BOOKED.id}/reschedule`)
          .send(body)
          .set('X-Client-Access', access ?? 'valid-access');
      const withoutAccess = (body: object) =>
        t.http.patch(`/client/bookings/${BOOKED.id}/reschedule`).send(body);

      beforeEach(() => {
        t.bookings.findById.mockResolvedValue(BOOKED);
        t.bookings.lastReceivedByEmployee.mockResolvedValue(new Map());
        t.services.findById.mockResolvedValue(ANAS_SERVICE);
        t.branches.findById.mockResolvedValue(ANAS_BRANCH);
        t.availabilities.findById.mockResolvedValue(AVAILABILITY);
        t.bookings.listOccupiedByUser.mockResolvedValue([]);
        t.bookings.reschedulePendingOrBooked.mockResolvedValue({
          ...CLIENT_BOOKED,
          startsAt: new Date(NEW_START),
          endsAt: new Date('2026-01-02T15:30:00.000Z'),
        });
      });

      it('mueve un Turno BOOKED a otro Horario reservable, y sigue BOOKED', async () => {
        const res = await patch({ startsAt: NEW_START }).expect(200);

        expect(t.bookings.reschedulePendingOrBooked).toHaveBeenCalledWith(BOOKED.id, {
          employeeId: ANAS_EMPLOYEE.id,
          userId: ANAS_EMPLOYEE.userId,
          prepStartsAt: new Date(NEW_START),
          startsAt: new Date(NEW_START),
          endsAt: new Date('2026-01-02T15:30:00.000Z'),
          status: BookingStatus.BOOKED,
        });
        expect(res.body).toMatchObject({ id: BOOKED.id, startsAt: NEW_START });
      });

      it('mueve un Turno PENDING y lo deja PENDING con Aprobación manual', async () => {
        t.bookings.findById.mockResolvedValue({ ...BOOKED, status: BookingStatus.PENDING });
        t.services.findById.mockResolvedValue({ ...ANAS_SERVICE, requiresApproval: true });

        await patch({ startsAt: NEW_START }).expect(200);

        expect(t.bookings.reschedulePendingOrBooked).toHaveBeenCalledWith(
          BOOKED.id,
          expect.objectContaining({ status: BookingStatus.PENDING }),
        );
      });

      it('deja PENDING un Turno BOOKED cuando el Servicio pide Aprobación manual', async () => {
        t.services.findById.mockResolvedValue({ ...ANAS_SERVICE, requiresApproval: true });

        await patch({ startsAt: NEW_START }).expect(200);

        expect(t.bookings.reschedulePendingOrBooked).toHaveBeenCalledWith(
          BOOKED.id,
          expect.objectContaining({ status: BookingStatus.PENDING }),
        );
      });

      it('answers 422 for a horario que no es un Horario reservable', async () => {
        t.bookings.listOccupiedByUser.mockResolvedValue([
          { prepStartsAt: new Date(NEW_START), endsAt: new Date('2026-01-02T15:30:00.000Z') },
        ]);

        const res = await patch({ startsAt: NEW_START }).expect(422);
        expect(res.body.message).toBe(
          `Slot ${NEW_START} is not available for Service ${ANAS_SERVICE.id}`,
        );
        expect(t.bookings.reschedulePendingOrBooked).not.toHaveBeenCalled();
      });

      it('answers 409 when the database catches the overlap in a race', async () => {
        t.bookings.reschedulePendingOrBooked.mockRejectedValue(
          new ConflictError('Overlaps a booked Turno for this Employee'),
        );

        await patch({ startsAt: NEW_START }).expect(409);
      });

      it.each([BookingStatus.REJECTED, BookingStatus.CANCELLED])(
        'answers 422 when the Turno is %s',
        async (status) => {
          t.bookings.findById.mockResolvedValue({ ...BOOKED, status });

          await patch({ startsAt: NEW_START }).expect(422);
          expect(t.bookings.reschedulePendingOrBooked).not.toHaveBeenCalled();
        },
      );

      it('answers 404 for another email', async () => {
        t.bookings.findById.mockResolvedValue({ ...BOOKED, clientEmail: 'other@example.com' });

        await patch({ startsAt: NEW_START }).expect(404);
      });

      it('rejects a missing or malformed startsAt with 400', async () => {
        await patch({}).expect(400);
        await patch({ startsAt: 'mañana' }).expect(400);
      });

      it('answers 401 without an access', async () => {
        await withoutAccess({ startsAt: NEW_START }).expect(401);
      });
    });
  });
});
