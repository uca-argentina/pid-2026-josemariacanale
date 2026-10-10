import { Availability } from '../../domain/availabilities/availability';
import { Booking, BookingStatus } from '../../domain/bookings/booking';
import { ConflictError } from '../../domain/errors';
import { Service, ServiceCategory } from '../../domain/services/service';
import {
  ANA,
  ANAS_SERVICE,
  bearer,
  BRUNO,
  CLERK_TOKEN,
  createTestApp,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  TestApp,
  workWeek,
} from '../../test-app';

/** Ana's Availability, in Tokyo: a Servicio personal reads its days there, not in any Sucursal's zone. */
const AVAILABILITY: Availability = {
  id: 10,
  userId: ANA.id,
  name: 'Horas laborables',
  timeZone: 'Asia/Tokyo',
  isDefault: true,
  schedule: workWeek('09:00', '18:00'),
  overrides: [],
};

const ANAS_USER = { ...ANA, slug: 'ana-perez' };

/** A Servicio personal of Ana, with no Sucursal and no Empleados. */
const PERSONAL: Service = {
  ...ANAS_SERVICE,
  id: 5,
  branchId: null,
  userId: ANA.id,
  availabilityId: AVAILABILITY.id,
  slug: 'consulta',
  employees: [],
};

const VALID_PERSONAL = {
  name: 'Consulta',
  category: ServiceCategory.CLINICA,
  durationMinutes: 30,
  price: 20,
  slug: 'consulta',
  availabilityId: AVAILABILITY.id,
};

describe('Servicio personal', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    t.availabilities.findById.mockResolvedValue(AVAILABILITY);
  });
  afterEach(() => t.app.close());

  describe('POST /users/me/services', () => {
    beforeEach(() => {
      scriptSession(t);
      t.services.createPersonal.mockResolvedValue(PERSONAL);
    });

    it('creates a Servicio personal of the Usuario with one of their Availabilities, with no Negocio', async () => {
      const res = await t.http
        .post('/users/me/services')
        .set(bearer(CLERK_TOKEN))
        .send(VALID_PERSONAL)
        .expect(201);

      expect(t.services.createPersonal).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: ANA.id,
          availabilityId: AVAILABILITY.id,
          slug: 'consulta',
          hidden: false,
        }),
      );
      expect(res.body).toMatchObject({
        id: PERSONAL.id,
        branchId: null,
        userId: ANA.id,
        availabilityId: AVAILABILITY.id,
        employees: [],
      });
    });

    it("answers 404 for an Availability that is someone else's", async () => {
      t.availabilities.findById.mockResolvedValue({
        ...AVAILABILITY,
        userId: BRUNO.id,
      });

      await t.http
        .post('/users/me/services')
        .set(bearer(CLERK_TOKEN))
        .send(VALID_PERSONAL)
        .expect(404);

      expect(t.services.createPersonal).not.toHaveBeenCalled();
    });

    it("answers 409 when the slug is already one of the Usuario's Servicios", async () => {
      t.services.createPersonal.mockRejectedValue(
        new ConflictError('Service booking link already in use'),
      );

      const res = await t.http
        .post('/users/me/services')
        .set(bearer(CLERK_TOKEN))
        .send(VALID_PERSONAL)
        .expect(409);

      expect(res.body.message).toBe('Service booking link already in use');
    });

    it('rejects a body without availabilityId with 400', async () => {
      const { availabilityId: _, ...withoutAvailability } = VALID_PERSONAL;

      await t.http
        .post('/users/me/services')
        .set(bearer(CLERK_TOKEN))
        .send(withoutAvailability)
        .expect(400);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.post('/users/me/services').send(VALID_PERSONAL).expect(401);
    });
  });

  describe('GET /users/me/services', () => {
    it('lists the Usuario’s Servicios personales, hidden ones included', async () => {
      scriptSession(t);
      t.services.listActiveByUser.mockResolvedValue([
        PERSONAL,
        { ...PERSONAL, id: 6, slug: 'oculto', hidden: true },
      ]);

      const res = await t.http
        .get('/users/me/services')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.services.listActiveByUser).toHaveBeenCalledWith(ANA.id);
      expect(res.body.map((s: { id: number }) => s.id)).toEqual([5, 6]);
    });
  });

  describe('PATCH and DELETE /services/:id', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.services.findById.mockResolvedValue(PERSONAL);
      t.services.update.mockResolvedValue({ ...PERSONAL, hidden: true });
      t.services.retire.mockResolvedValue({
        service: PERSONAL,
        cancelledBookings: 2,
      });
    });

    it('lets the Usuario hide their own Servicio', async () => {
      await t.http
        .patch('/services/5')
        .set(bearer(CLERK_TOKEN))
        .send({ hidden: true })
        .expect(200);

      expect(t.services.update).toHaveBeenCalledWith(5, { hidden: true });
    });

    it('lets the Usuario move it to another of their own Availabilities', async () => {
      await t.http
        .patch('/services/5')
        .set(bearer(CLERK_TOKEN))
        .send({ availabilityId: 11 })
        .expect(200);

      expect(t.services.update).toHaveBeenCalledWith(5, { availabilityId: 11 });
    });

    it('answers 404 for an Availability of someone else', async () => {
      t.availabilities.findById.mockResolvedValue({
        ...AVAILABILITY,
        userId: BRUNO.id,
      });

      await t.http
        .patch('/services/5')
        .set(bearer(CLERK_TOKEN))
        .send({ availabilityId: 11 })
        .expect(404);
    });

    it('answers 422 for an availabilityId on a Servicio del Negocio', async () => {
      t.services.findById.mockResolvedValue(ANAS_SERVICE);
      t.branches.findById.mockResolvedValue({
        id: 1,
        businessId: 1,
        name: 'Downtown',
        address: '123 Main St',
        timeZone: 'America/Argentina/Buenos_Aires',
        slug: 'downtown',
        description: null,
      });
      t.businesses.findById.mockResolvedValue({
        id: 1,
        name: "Ana's Salon",
        description: 'Hair and nails',
        ownerId: ANA.id,
        slug: 'anas-salon',
        deletedAt: null,
        logoUrl: null,
      });

      await t.http
        .patch('/services/1')
        .set(bearer(CLERK_TOKEN))
        .send({ availabilityId: 10 })
        .expect(422);
    });

    it('answers 403 to someone who is not the Usuario of the Servicio', async () => {
      await t.http
        .patch('/services/5')
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ hidden: true })
        .expect(403);
      await t.http
        .delete('/services/5')
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);

      expect(t.services.update).not.toHaveBeenCalled();
      expect(t.services.retire).not.toHaveBeenCalled();
    });

    it('lets the Usuario dar de baja their own Servicio, cancelling its future Turnos', async () => {
      const res = await t.http
        .delete('/services/5')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual({ id: 5, cancelledBookings: 2 });
    });

    it('has no Empleados to Ofrecer or dejar de ofrecer', async () => {
      await t.http
        .post('/services/5/employees')
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: 1 })
        .expect(422);
      await t.http
        .delete('/services/5/employees/1')
        .set(bearer(CLERK_TOKEN))
        .expect(422);
    });
  });

  describe('Enlace de reserva del Usuario', () => {
    beforeEach(() => {
      t.users.findBySlug.mockImplementation(async (slug) =>
        slug === 'ana-perez' ? ANAS_USER : null,
      );
      t.services.listActiveByUser.mockResolvedValue([
        PERSONAL,
        { ...PERSONAL, id: 6, slug: 'oculto', hidden: true },
      ]);
      t.services.findActiveByUserSlug.mockImplementation(async (_, slug) =>
        slug === 'consulta'
          ? PERSONAL
          : slug === 'oculto'
            ? { ...PERSONAL, id: 6, slug: 'oculto', hidden: true }
            : null,
      );
    });

    it('GET /u/:userSlug shows the Usuario and their Servicios not hidden, without a Sesión', async () => {
      const res = await t.http.get('/u/Ana-Perez').expect(200);

      expect(res.body.name).toBe(ANA.name);
      expect(res.body.slug).toBe('ana-perez');
      expect(res.body.services.map((s: { id: number }) => s.id)).toEqual([5]);
    });

    it('GET /u/:userSlug answers 404 for an unknown Usuario', async () => {
      await t.http.get('/u/nadie').expect(404);
    });

    it('GET /u/:userSlug/:serviceSlug opens a hidden Servicio by its own tramo', async () => {
      const res = await t.http.get('/u/ana-perez/oculto').expect(200);

      expect(res.body).toMatchObject({ id: 6, hidden: true });
    });

    it('GET /u/:userSlug/:serviceSlug answers 404 for an unknown Usuario or Servicio', async () => {
      await t.http.get('/u/nadie/consulta').expect(404);
      await t.http.get('/u/ana-perez/otro').expect(404);
    });
  });

  describe('Horarios reservables y Reservar', () => {
    const BOOKING: Booking = {
      id: 1,
      serviceId: PERSONAL.id,
      employeeId: null,
      userId: ANA.id,
      clientName: 'Bruno Díaz',
      clientEmail: 'bruno@example.com',
      prepStartsAt: new Date('2026-01-02T00:00:00.000Z'),
      startsAt: new Date('2026-01-02T00:00:00.000Z'),
      endsAt: new Date('2026-01-02T00:30:00.000Z'),
      status: BookingStatus.BOOKED,
      notes: null,
      noShowAt: null,
      link: 'booking-link-secret',
    };

    beforeEach(() => {
      t.services.findById.mockResolvedValue(PERSONAL);
      t.bookings.listOccupiedByUser.mockResolvedValue([]);
      t.users.findById.mockResolvedValue(ANAS_USER);
      t.bookings.create.mockResolvedValue(BOOKING);
    });

    it('reads the days in the zone of the Availability, and the occupancy by Usuario', async () => {
      const res = await t.http
        .get('/services/5/slots?from=2026-01-02&to=2026-01-02')
        .expect(200);

      expect(res.body.timeZone).toBe('Asia/Tokyo');
      // 09:00 in Tokyo is 00:00 UTC.
      expect(res.body.days[0].slots[0]).toBe('2026-01-02T00:00:00.000Z');
      expect(t.bookings.listOccupiedByUser).toHaveBeenCalledWith(
        ANA.id,
        expect.any(Date),
        expect.any(Date),
        undefined,
      );
      expect(t.branches.findById).not.toHaveBeenCalled();
    });

    it('a Turno of the Usuario elsewhere takes the horario off the Servicio personal', async () => {
      t.bookings.listOccupiedByUser.mockResolvedValue([
        {
          prepStartsAt: new Date('2026-01-02T00:00:00.000Z'),
          endsAt: new Date('2026-01-02T00:30:00.000Z'),
        },
      ]);

      const res = await t.http
        .get('/services/5/slots?from=2026-01-02&to=2026-01-02')
        .expect(200);

      expect(res.body.days[0].slots).not.toContain('2026-01-02T00:00:00.000Z');
    });

    it('books the Turno with the Usuario as who attends it and no Empleado', async () => {
      const res = await t.http
        .post('/bookings')
        .send({
          serviceId: PERSONAL.id,
          startsAt: '2026-01-02T00:00:00.000Z',
          clientName: 'Bruno Díaz',
          clientEmail: 'bruno@example.com',
          code: 'A1B2C3',
        })
        .expect(201);

      expect(t.bookings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: PERSONAL.id,
          employeeId: null,
          userId: ANA.id,
        }),
        undefined,
      );
      expect(res.body.employeeName).toBe(ANA.name);
    });

    it('counts the Límite diario in the zone of the Availability', async () => {
      t.services.findById.mockResolvedValue({ ...PERSONAL, dailyLimit: 1 });
      t.bookings.listOccupiedStartsByService.mockResolvedValue([]);
      t.bookings.create.mockRejectedValue(
        new ConflictError('The Service reached its Límite diario that day'),
      );

      await t.http
        .post('/bookings')
        .send({
          serviceId: PERSONAL.id,
          startsAt: '2026-01-02T00:00:00.000Z',
          clientName: 'Bruno Díaz',
          clientEmail: 'bruno@example.com',
          code: 'A1B2C3',
        })
        .expect(409);

      // The Tokyo day of 2026-01-02 is [2026-01-01T15:00Z, 2026-01-02T15:00Z).
      expect(t.bookings.create).toHaveBeenCalledWith(expect.anything(), {
        serviceId: PERSONAL.id,
        limit: 1,
        from: new Date('2026-01-01T15:00:00.000Z'),
        to: new Date('2026-01-02T15:00:00.000Z'),
      });
    });
  });
});
