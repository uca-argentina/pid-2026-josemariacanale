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

const LINK = 'booking-link-secret';

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
  link: LINK,
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
  user: null,
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

describe('Enlace del Turno', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
  });
  afterEach(() => t.app.close());

  describe('GET /booking-links/:secret', () => {
    it('abre el Turno de su Enlace, sin Código ni acceso', async () => {
      t.bookings.findByLink.mockResolvedValue(CLIENT_BOOKED);

      const res = await t.http.get(`/booking-links/${LINK}`).expect(200);

      expect(t.bookings.findByLink).toHaveBeenCalledWith(LINK);
      expect(res.body).toMatchObject({ id: BOOKED.id, status: 'BOOKED' });
    });

    it('abre un Turno ya CANCELLED igual', async () => {
      t.bookings.findByLink.mockResolvedValue({
        ...CLIENT_BOOKED,
        status: BookingStatus.CANCELLED,
      });

      const res = await t.http.get(`/booking-links/${LINK}`).expect(200);

      expect(res.body).toMatchObject({ status: 'CANCELLED' });
    });

    it('answers 404 for an unknown link', async () => {
      t.bookings.findByLink.mockRejectedValue(new NotFoundError('Turno not found'));

      const res = await t.http.get(`/booking-links/${LINK}`).expect(404);
      expect(res.body.message).toBe('Turno not found');
    });

    it('answers null user for a Turno de un Servicio del Negocio', async () => {
      t.bookings.findByLink.mockResolvedValue(CLIENT_BOOKED);

      const res = await t.http.get(`/booking-links/${LINK}`).expect(200);

      expect(res.body).toMatchObject({ user: null });
    });

    it("answers el Enlace de reserva del Usuario para un Servicio personal", async () => {
      t.bookings.findByLink.mockResolvedValue({
        ...CLIENT_BOOKED,
        employeeId: null,
        business: null,
        branch: null,
        user: { slug: 'ana' },
      });

      const res = await t.http.get(`/booking-links/${LINK}`).expect(200);

      expect(res.body).toMatchObject({ user: { slug: 'ana' } });
    });
  });

  describe('PATCH /booking-links/:secret/cancel', () => {
    const patch = () => t.http.patch(`/booking-links/${LINK}/cancel`);

    beforeEach(() => {
      t.bookings.findByLink.mockResolvedValue(CLIENT_BOOKED);
      t.bookings.cancelPendingOrBooked.mockResolvedValue({
        ...CLIENT_BOOKED,
        status: BookingStatus.CANCELLED,
      });
    });

    it('cancela un Turno BOOKED por su Enlace', async () => {
      const res = await patch().expect(200);

      expect(t.bookings.cancelPendingOrBooked).toHaveBeenCalledWith(BOOKED.id);
      expect(res.body).toMatchObject({ id: BOOKED.id, status: 'CANCELLED' });
    });

    it('cancela un Turno PENDING por su Enlace', async () => {
      t.bookings.findByLink.mockResolvedValue({
        ...CLIENT_BOOKED,
        status: BookingStatus.PENDING,
      });

      await patch().expect(200);

      expect(t.bookings.cancelPendingOrBooked).toHaveBeenCalledWith(BOOKED.id);
    });

    it.each([BookingStatus.REJECTED, BookingStatus.CANCELLED])(
      'answers 422 when the Turno is %s',
      async (status) => {
        t.bookings.findByLink.mockResolvedValue({ ...CLIENT_BOOKED, status });

        await patch().expect(422);
        expect(t.bookings.cancelPendingOrBooked).not.toHaveBeenCalled();
      },
    );

    it('answers 422 for a Turno that already started', async () => {
      t.clock.advance(BOOKED.startsAt.getTime() - t.clock.now().getTime());

      await patch().expect(422);
      expect(t.bookings.cancelPendingOrBooked).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown link', async () => {
      t.bookings.findByLink.mockRejectedValue(new NotFoundError('Turno not found'));

      const res = await patch().expect(404);
      expect(res.body.message).toBe('Turno not found');
    });
  });

  describe('PATCH /booking-links/:secret/reschedule', () => {
    const NEW_START = '2026-01-02T15:00:00.000Z'; // Friday 12:00 ARG
    const patch = (body: object) =>
      t.http.patch(`/booking-links/${LINK}/reschedule`).send(body);

    beforeEach(() => {
      t.bookings.findByLink.mockResolvedValue(CLIENT_BOOKED);
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

    it('deja PENDING un Turno cuando el Servicio pide Aprobación manual', async () => {
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

      await patch({ startsAt: NEW_START }).expect(422);
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
        t.bookings.findByLink.mockResolvedValue({ ...CLIENT_BOOKED, status });

        await patch({ startsAt: NEW_START }).expect(422);
        expect(t.bookings.reschedulePendingOrBooked).not.toHaveBeenCalled();
      },
    );

    it('answers 404 for an unknown link', async () => {
      t.bookings.findByLink.mockRejectedValue(new NotFoundError('Turno not found'));

      const res = await patch({ startsAt: NEW_START }).expect(404);
      expect(res.body.message).toBe('Turno not found');
    });

    it('rejects a missing or malformed startsAt with 400', async () => {
      await patch({}).expect(400);
      await patch({ startsAt: 'mañana' }).expect(400);
    });
  });
});
