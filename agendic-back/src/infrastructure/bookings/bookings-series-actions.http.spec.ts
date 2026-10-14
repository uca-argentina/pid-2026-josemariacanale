import { Booking, BookingActor, BookingStatus, ClientBooking } from '../../domain/bookings/booking';
import {
  ANAS_BRANCH,
  ANAS_BUSINESS,
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

const SERIES_ID = '6f1b6c0e-3c58-4a39-9d62-6a9f6f9c2f10';
const LINK = 'link-2';

/** The Turno `n` of a Serie of 3 Mondays at 09:00 in Buenos Aires, each with its own Enlace. */
const turno = (n: number, status = BookingStatus.PENDING, seriesId: string | null = SERIES_ID): Booking => ({
  id: n,
  serviceId: ANAS_SERVICE.id,
  employeeId: ANAS_EMPLOYEE.id,
  userId: ANAS_EMPLOYEE.userId,
  cabinId: null,
  clientName: 'Carla Gómez',
  clientEmail: 'carla@example.com',
  prepStartsAt: new Date(`2026-01-${String(5 + 7 * (n - 1)).padStart(2, '0')}T12:00:00.000Z`),
  startsAt: new Date(`2026-01-${String(5 + 7 * (n - 1)).padStart(2, '0')}T12:00:00.000Z`),
  endsAt: new Date(`2026-01-${String(5 + 7 * (n - 1)).padStart(2, '0')}T12:30:00.000Z`),
  status,
  notes: null,
  noShowAt: null,
  employeeNoShowAt: null,
  link: `link-${n}`,
  fromRescheduleId: null,
  seriesId,
  employeeChosen: false,
  depositAmount: null,
  depositPaidAt: null,
  price: 50,
  cancelledAt: null,
  rejectedAt: null,
  acceptedAt: null,
  cancelledBy: null,
  cancellationReason: null,
});

const asClient = (booking: Booking): ClientBooking => ({
  ...booking,
  timeZone: ANAS_BRANCH.timeZone,
  employeeName: ANAS_EMPLOYEE.name,
  rating: null,
  service: {
    name: ANAS_SERVICE.name,
    durationMinutes: ANAS_SERVICE.durationMinutes,
    price: ANAS_SERVICE.price,
    depositPercent: ANAS_SERVICE.depositPercent,
  },
  business: { name: ANAS_BUSINESS.name, slug: ANAS_BUSINESS.slug },
  branch: { name: ANAS_BRANCH.name, slug: ANAS_BRANCH.slug, address: ANAS_BRANCH.address, coverUrl: null },
  user: null,
  series: null,
});

describe('Acciones sobre la Serie (#305)', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    scriptOtherSession(t);
    t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);
    t.bookings.findByLink.mockImplementation(async (link) => asClient(turno(Number(link.slice(5)))));
  });
  afterEach(() => t.app.close());

  describe('PATCH /bookings/:id/accept con series', () => {
    const patch = (token = CLERK_TOKEN) =>
      t.http.patch('/bookings/1/accept').set(bearer(token)).send({ series: true });

    it('acepta los pendientes de la Serie y los responde en accepted', async () => {
      t.bookings.findById.mockResolvedValue(turno(1));
      t.bookings.resolvePendingSeries.mockResolvedValue([
        turno(1, BookingStatus.BOOKED),
        turno(2, BookingStatus.BOOKED),
      ]);

      const res = await patch().expect(200);

      expect(t.bookings.resolvePendingSeries).toHaveBeenCalledWith(
        SERIES_ID,
        ANAS_EMPLOYEE.userId,
        BookingStatus.BOOKED,
        t.clock.now(),
        null,
      );
      expect(res.body.accepted.map((b: { id: number }) => b.id)).toEqual([1, 2]);
      expect(t.mailer.sendBookingRejection).not.toHaveBeenCalled();
    });

    it('sigue aceptando un solo Turno sin series', async () => {
      t.bookings.findById.mockResolvedValue(turno(1));
      t.bookings.resolvePending.mockResolvedValue(turno(1, BookingStatus.BOOKED));

      const res = await t.http.patch('/bookings/1/accept').set(bearer(CLERK_TOKEN)).expect(200);

      expect(res.body).toMatchObject({ id: 1, status: 'BOOKED' });
      expect(t.bookings.resolvePendingSeries).not.toHaveBeenCalled();
    });

    it('responde 422 en un Turno sin Serie', async () => {
      t.bookings.findById.mockResolvedValue(turno(1, BookingStatus.PENDING, null));

      const res = await patch().expect(422);

      expect(res.body.message).toBe('Turno 1 is not part of a Serie');
      expect(t.bookings.resolvePendingSeries).not.toHaveBeenCalled();
    });

    it('responde 403 si no es el Empleado asignado', async () => {
      t.bookings.findById.mockResolvedValue(turno(1));

      await patch(OTHER_CLERK_TOKEN).expect(403);

      expect(t.bookings.resolvePendingSeries).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /bookings/:id/reject con series', () => {
    const patch = (body: object = { series: true }) =>
      t.http.patch('/bookings/1/reject').set(bearer(CLERK_TOKEN)).send(body);

    beforeEach(() => {
      t.bookings.findById.mockResolvedValue(turno(1));
      t.bookings.resolvePendingSeries.mockResolvedValue(
        [1, 2, 3].map((n) => ({
          ...turno(n, BookingStatus.REJECTED),
          cancelledBy: BookingActor.EMPLOYEE,
          cancellationReason: 'No atendemos',
        })),
      );
    });

    it('rechaza la Serie con el motivo y manda un solo mail con todas las fechas', async () => {
      const res = await patch({ series: true, reason: ' No atendemos ' }).expect(200);

      expect(t.bookings.resolvePendingSeries).toHaveBeenCalledWith(
        SERIES_ID,
        ANAS_EMPLOYEE.userId,
        BookingStatus.REJECTED,
        t.clock.now(),
        'No atendemos',
      );
      expect(res.body.rejected).toHaveLength(3);
      expect(t.mailer.sendBookingRejection).toHaveBeenCalledTimes(1);
      expect(t.mailer.sendBookingRejection).toHaveBeenCalledWith(
        'carla@example.com',
        'link-1',
        'No atendemos',
        {
          bookings: [1, 2, 3].map((n) => ({ startsAt: turno(n).startsAt, link: `link-${n}` })),
          timeZone: ANAS_BRANCH.timeZone,
        },
      );
    });

    it('no manda ningún mail si no quedaba ningún pendiente', async () => {
      t.bookings.resolvePendingSeries.mockResolvedValue([]);

      const res = await patch().expect(200);

      expect(res.body).toEqual({ rejected: [] });
      expect(t.mailer.sendBookingRejection).not.toHaveBeenCalled();
    });

    it('responde 200 aunque el mail falle', async () => {
      t.mailer.sendBookingRejection.mockRejectedValue(new Error('smtp down'));

      await patch().expect(200);
    });

    it('responde 422 en un Turno sin Serie', async () => {
      t.bookings.findById.mockResolvedValue(turno(1, BookingStatus.PENDING, null));

      const res = await patch().expect(422);

      expect(res.body.message).toBe('Turno 1 is not part of a Serie');
    });
  });

  describe('PATCH /bookings/:id/cancel con andFollowing', () => {
    const patch = (body: object = { andFollowing: true }) =>
      t.http.patch('/bookings/2/cancel').set(bearer(CLERK_TOKEN)).send(body);

    beforeEach(() => {
      t.bookings.findById.mockResolvedValue(turno(2, BookingStatus.BOOKED));
      t.bookings.cancelSeriesFrom.mockResolvedValue(
        [2, 3].map((n) => ({
          ...turno(n, BookingStatus.CANCELLED),
          cancelledBy: BookingActor.EMPLOYEE,
          cancellationReason: 'Estoy enfermo',
        })),
      );
    });

    it('cancela ese Turno y los siguientes, dejando en pie los anteriores', async () => {
      const res = await patch({ andFollowing: true, reason: 'Estoy enfermo' }).expect(200);

      expect(t.bookings.cancelSeriesFrom).toHaveBeenCalledWith(
        SERIES_ID,
        ANAS_EMPLOYEE.userId,
        turno(2).startsAt,
        t.clock.now(),
        'Estoy enfermo',
      );
      expect(res.body.cancelled.map((b: { id: number }) => b.id)).toEqual([2, 3]);
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledTimes(1);
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledWith(
        'carla@example.com',
        'link-2',
        'Estoy enfermo',
        {
          bookings: [2, 3].map((n) => ({ startsAt: turno(n).startsAt, link: `link-${n}` })),
          timeZone: ANAS_BRANCH.timeZone,
        },
      );
    });

    it('con un solo Turno afectado manda el aviso de siempre', async () => {
      t.bookings.cancelSeriesFrom.mockResolvedValue([turno(3, BookingStatus.CANCELLED)]);

      await patch().expect(200);

      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledWith('carla@example.com', 'link-3', null);
    });

    it('responde 422 en un Turno sin Serie', async () => {
      t.bookings.findById.mockResolvedValue(turno(2, BookingStatus.BOOKED, null));

      const res = await patch().expect(422);

      expect(res.body.message).toBe('Turno 2 is not part of a Serie');
      expect(t.bookings.cancelSeriesFrom).not.toHaveBeenCalled();
    });

    it('responde 400 si andFollowing no es un booleano', async () => {
      await patch({ andFollowing: 'si' }).expect(400);
    });
  });

  describe('PATCH /booking-links/:secret/cancel con andFollowing', () => {
    const patch = (body: object = { andFollowing: true }) =>
      t.http.patch(`/booking-links/${LINK}/cancel`).send(body);

    beforeEach(() => {
      t.bookings.cancelSeriesFromByLink.mockResolvedValue(
        [2, 3].map((n) => asClient({ ...turno(n, BookingStatus.CANCELLED), cancelledBy: BookingActor.CLIENT })),
      );
    });

    it('cancela este y los siguientes y deja kept vacío', async () => {
      const res = await patch({ andFollowing: true, reason: 'Me mudo' }).expect(200);

      expect(t.bookings.cancelSeriesFromByLink).toHaveBeenCalledWith(
        SERIES_ID,
        turno(2).startsAt,
        t.clock.now(),
        'Me mudo',
      );
      expect(res.body.cancelled.map((b: { id: number }) => b.id)).toEqual([2, 3]);
      expect(res.body.kept).toEqual([]);
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledTimes(1);
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledWith('carla@example.com', 'link-2', null, {
        bookings: [2, 3].map((n) => ({ startsAt: turno(n).startsAt, link: `link-${n}` })),
        timeZone: ANAS_BRANCH.timeZone,
      });
    });

    it('responde 200 aunque el mail falle', async () => {
      t.mailer.sendBookingCancellation.mockRejectedValue(new Error('smtp down'));

      await patch().expect(200);
    });

    it('responde 422 en un Turno sin Serie', async () => {
      t.bookings.findByLink.mockResolvedValue(asClient(turno(2, BookingStatus.BOOKED, null)));

      const res = await patch().expect(422);

      expect(res.body.message).toBe('Turno 2 is not part of a Serie');
    });

    it('responde 422 si el Turno ya empezó', async () => {
      t.clock.advance(60 * 24 * 3_600_000);

      const res = await patch().expect(422);

      expect(res.body.message).toBe('Turno 2 already started');
    });
  });
});
