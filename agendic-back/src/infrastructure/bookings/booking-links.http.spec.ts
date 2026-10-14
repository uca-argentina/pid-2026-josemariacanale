import { Availability } from '../../domain/availabilities/availability';
import { Booking, BookingStatus, ClientBooking } from '../../domain/bookings/booking';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../domain/errors';
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
  link: LINK,
  fromRescheduleId: null,
  seriesId: null,
  employeeChosen: false,
  depositAmount: null,
  depositPaidAt: null,
  price: 50,
  cancelledAt: null,
  rejectedAt: null,
  acceptedAt: null,
  cancelledBy: null,
  cancellationReason: null,
};

const CLIENT_BOOKED: ClientBooking = {
  ...BOOKED,
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
  branch: {
    name: ANAS_BRANCH.name,
    slug: ANAS_BRANCH.slug,
    address: ANAS_BRANCH.address,
    coverUrl: null,
  },
  user: null,
  series: null,
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

    it('un Turno suelto trae series null', async () => {
      t.bookings.findByLink.mockResolvedValue(CLIENT_BOOKED);

      const res = await t.http.get(`/booking-links/${LINK}`).expect(200);

      expect(res.body.series).toBeNull();
    });

    it('un Turno de una Serie trae los Turnos de la Serie con su estado y su Enlace', async () => {
      const turnos = [
        { startsAt: new Date('2026-01-05T12:00:00Z'), status: BookingStatus.BOOKED, link: LINK },
        { startsAt: new Date('2026-01-12T12:00:00Z'), status: BookingStatus.CANCELLED, link: 'otro' },
      ];
      t.bookings.findByLink.mockResolvedValue({ ...CLIENT_BOOKED, series: { bookings: turnos } });

      const res = await t.http.get(`/booking-links/${LINK}`).expect(200);

      expect(res.body.series).toEqual({
        bookings: [
          { startsAt: '2026-01-05T12:00:00.000Z', status: 'BOOKED', link: LINK },
          { startsAt: '2026-01-12T12:00:00.000Z', status: 'CANCELLED', link: 'otro' },
        ],
      });
    });

    it('no expone la Cabina del Turno', async () => {
      t.bookings.findByLink.mockResolvedValue({ ...CLIENT_BOOKED, cabinId: 10 });

      const res = await t.http.get(`/booking-links/${LINK}`).expect(200);

      expect(res.body).not.toHaveProperty('cabinId');
      expect(res.body).not.toHaveProperty('cabin');
    });

    it('trae employeeChosen', async () => {
      t.bookings.findByLink.mockResolvedValue({ ...CLIENT_BOOKED, employeeChosen: true });

      const res = await t.http.get(`/booking-links/${LINK}`).expect(200);

      expect(res.body.employeeChosen).toBe(true);
    });

    it('trae la Seña pendiente del Turno y cuándo se pagó', async () => {
      t.bookings.findByLink.mockResolvedValue({
        ...CLIENT_BOOKED,
        depositAmount: 6,
        depositPaidAt: new Date('2026-01-01T10:00:00.000Z'),
      });

      const res = await t.http.get(`/booking-links/${LINK}`).expect(200);

      expect(res.body).toMatchObject({
        depositAmount: 6,
        depositPaidAt: '2026-01-01T10:00:00.000Z',
      });
    });

    it('trae depositAmount y depositPaidAt en null sin Seña', async () => {
      t.bookings.findByLink.mockResolvedValue(CLIENT_BOOKED);

      const res = await t.http.get(`/booking-links/${LINK}`).expect(200);

      expect(res.body).toMatchObject({ depositAmount: null, depositPaidAt: null });
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

      expect(t.bookings.cancelPendingOrBooked).toHaveBeenCalledWith(BOOKED.id, t.clock.now(), null);
      expect(res.body).toMatchObject({ id: BOOKED.id, status: 'CANCELLED' });
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledWith(
        BOOKED.clientEmail,
        BOOKED.link,
        null,
      );
    });

    it('guarda el Motivo de cancelación y lo manda en el Aviso de cambio del Turno', async () => {
      t.bookings.cancelPendingOrBooked.mockResolvedValue({
        ...CLIENT_BOOKED,
        status: BookingStatus.CANCELLED,
        cancellationReason: 'Me mudé',
      });

      const res = await patch().send({ reason: 'Me mudé' }).expect(200);

      expect(t.bookings.cancelPendingOrBooked).toHaveBeenCalledWith(BOOKED.id, t.clock.now(), 'Me mudé');
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledWith(
        BOOKED.clientEmail,
        BOOKED.link,
        'Me mudé',
      );
      expect(res.body.cancellationReason).toBe('Me mudé');
    });

    it('responde 400 reason is too long con más de 500 caracteres, sin cancelar', async () => {
      const res = await patch().send({ reason: 'a'.repeat(501) }).expect(400);

      expect(res.body.message).toContain('reason is too long');
      expect(t.bookings.cancelPendingOrBooked).not.toHaveBeenCalled();
    });

    it('sigue respondiendo 200 si falla el mail al Cliente, porque el Turno ya quedó cancelado', async () => {
      t.mailer.sendBookingCancellation.mockRejectedValue(new Error('SMTP down'));

      await patch().expect(200);
    });

    it('cancela un Turno PENDING por su Enlace', async () => {
      t.bookings.findByLink.mockResolvedValue({
        ...CLIENT_BOOKED,
        status: BookingStatus.PENDING,
      });

      await patch().expect(200);

      expect(t.bookings.cancelPendingOrBooked).toHaveBeenCalledWith(BOOKED.id, t.clock.now(), null);
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

  describe('PATCH /booking-links/:secret/deposit', () => {
    const patch = () => t.http.patch(`/booking-links/${LINK}/deposit`);
    const WITH_DEPOSIT: ClientBooking = { ...CLIENT_BOOKED, depositAmount: 6 };

    beforeEach(() => {
      t.bookings.findByLink.mockResolvedValue(WITH_DEPOSIT);
      t.bookings.payDeposit.mockImplementation(async () => ({
        ...WITH_DEPOSIT,
        depositPaidAt: t.clock.now(),
      }));
    });

    it('paga la Seña de un Turno BOOKED y responde el Turno con depositPaidAt', async () => {
      const res = await patch().expect(200);

      expect(t.bookings.payDeposit).toHaveBeenCalledWith(BOOKED.id, t.clock.now());
      expect(res.body).toMatchObject({
        id: BOOKED.id,
        status: 'BOOKED',
        depositAmount: 6,
        depositPaidAt: t.clock.now().toISOString(),
      });
    });

    it('paga la Seña de un Turno PENDING y sigue PENDING', async () => {
      t.bookings.findByLink.mockResolvedValue({
        ...WITH_DEPOSIT,
        status: BookingStatus.PENDING,
      });
      t.bookings.payDeposit.mockResolvedValue({
        ...WITH_DEPOSIT,
        status: BookingStatus.PENDING,
        depositPaidAt: t.clock.now(),
      });

      const res = await patch().expect(200);

      expect(res.body.status).toBe('PENDING');
    });

    it('no manda mail', async () => {
      await patch().expect(200);

      expect(t.mailer.sendBookingCancellation).not.toHaveBeenCalled();
      expect(t.mailer.sendBookingReschedule).not.toHaveBeenCalled();
    });

    it.each([BookingStatus.REJECTED, BookingStatus.CANCELLED])(
      'answers 422 when the Turno is %s',
      async (status) => {
        t.bookings.findByLink.mockResolvedValue({ ...WITH_DEPOSIT, status });

        const res = await patch().expect(422);

        expect(res.body.message).toBe('Turno is not pending or booked');
        expect(t.bookings.payDeposit).not.toHaveBeenCalled();
      },
    );

    it('answers 422 for a Turno that already started', async () => {
      t.clock.advance(BOOKED.startsAt.getTime() - t.clock.now().getTime());

      const res = await patch().expect(422);

      expect(res.body.message).toBe(`Turno ${BOOKED.id} already started`);
      expect(t.bookings.payDeposit).not.toHaveBeenCalled();
    });

    it('answers 422 for a Turno without Seña', async () => {
      t.bookings.findByLink.mockResolvedValue(CLIENT_BOOKED);

      const res = await patch().expect(422);

      expect(res.body.message).toBe(`Turno ${BOOKED.id} has no Seña`);
      expect(t.bookings.payDeposit).not.toHaveBeenCalled();
    });

    it('answers 422 for a Seña already paid', async () => {
      t.bookings.findByLink.mockResolvedValue({
        ...WITH_DEPOSIT,
        depositPaidAt: new Date('2026-01-01T10:00:00.000Z'),
      });

      const res = await patch().expect(422);

      expect(res.body.message).toBe(`Turno ${BOOKED.id} already has its Seña paid`);
      expect(t.bookings.payDeposit).not.toHaveBeenCalled();
    });

    it('answers 422 when a race paid it or started the Turno between the read and the write', async () => {
      t.bookings.payDeposit.mockRejectedValue(new BusinessRuleError('Turno is not pending or booked'));

      await patch().expect(422);
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
        cabinId: null,
        prepStartsAt: new Date(NEW_START),
        startsAt: new Date(NEW_START),
        endsAt: new Date('2026-01-02T15:30:00.000Z'),
        status: BookingStatus.BOOKED,
      }, expect.any(Date));
      expect(res.body).toMatchObject({ id: BOOKED.id, startsAt: NEW_START });
      expect(t.mailer.sendBookingReschedule).toHaveBeenCalledWith(
        BOOKED.clientEmail,
        BOOKED.link,
      );
    });

    describe('con Cabinas (ADR 0030)', () => {
      const BOX = { id: 10, name: 'Box 1' };
      const LASER = { id: 11, name: 'Láser' };
      const OWN = {
        cabinId: BOX.id,
        prepStartsAt: BOOKED.prepStartsAt,
        endsAt: BOOKED.endsAt,
      };
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
      const cabinOfReschedule = () =>
        t.bookings.reschedulePendingOrBooked.mock.calls[0][1].cabinId;

      beforeEach(() => {
        t.services.findById.mockResolvedValue({
          ...ANAS_SERVICE,
          cabins: [BOX, LASER],
        });
        t.bookings.findByLink.mockResolvedValue({
          ...CLIENT_BOOKED,
          cabinId: BOX.id,
        });
        t.bookings.lastReceivedByCabin.mockResolvedValue(new Map());
        occupy(OWN);
      });

      it('conserva la Cabina si está libre en el horario nuevo', async () => {
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
          endsAt: new Date('2026-01-02T15:30:00.000Z'),
        });

        await patch({ startsAt: NEW_START }).expect(200);

        expect(cabinOfReschedule()).toBe(LASER.id);
      });

      it('asigna una a un Turno sin Cabina de un Servicio que ahora las admite', async () => {
        t.bookings.findByLink.mockResolvedValue(CLIENT_BOOKED);

        await patch({ startsAt: NEW_START }).expect(200);

        expect(cabinOfReschedule()).toBe(BOX.id);
      });

      it('deja null la Cabina si el Servicio ya no admite ninguna', async () => {
        t.services.findById.mockResolvedValue(ANAS_SERVICE);

        await patch({ startsAt: NEW_START }).expect(200);

        expect(cabinOfReschedule()).toBeNull();
      });

      it('answers 422 y no lo mueve si no queda ninguna Cabina libre', async () => {
        const atNewStart = {
          prepStartsAt: new Date(NEW_START),
          endsAt: new Date('2026-01-02T15:30:00.000Z'),
        };
        occupy(
          OWN,
          { cabinId: BOX.id, ...atNewStart },
          { cabinId: LASER.id, ...atNewStart },
        );

        const res = await patch({ startsAt: NEW_START }).expect(422);

        expect(res.body.message).toBe(
          `Slot ${NEW_START} is not available for Service ${ANAS_SERVICE.id}`,
        );
        expect(t.bookings.reschedulePendingOrBooked).not.toHaveBeenCalled();
      });

      it('el Cliente no ve la Cabina en la respuesta', async () => {
        t.bookings.reschedulePendingOrBooked.mockResolvedValue({
          ...CLIENT_BOOKED,
          cabinId: BOX.id,
        });

        const res = await patch({ startsAt: NEW_START }).expect(200);

        expect(res.body).not.toHaveProperty('cabinId');
        expect(res.body).not.toHaveProperty('cabin');
      });
    });

    it('deja pagada la Seña al Reagendar, también si el Turno vuelve a quedar PENDING', async () => {
      const paid = {
        ...CLIENT_BOOKED,
        depositAmount: 6,
        depositPaidAt: new Date('2026-01-01T10:00:00.000Z'),
      };
      t.bookings.findByLink.mockResolvedValue(paid);
      t.services.findById.mockResolvedValue({ ...ANAS_SERVICE, requiresApproval: true });
      t.bookings.reschedulePendingOrBooked.mockImplementation(async (_id, times) => ({
        ...paid,
        ...times,
      }));

      const res = await patch({ startsAt: NEW_START }).expect(200);

      expect(t.bookings.reschedulePendingOrBooked).toHaveBeenCalledWith(
        BOOKED.id,
        expect.not.objectContaining({ depositPaidAt: expect.anything() }),
        expect.any(Date),
      );
      expect(res.body).toMatchObject({
        status: 'PENDING',
        depositPaidAt: '2026-01-01T10:00:00.000Z',
      });
    });

    it('conserva la Seña del Turno al Reagendar', async () => {
      const withDeposit = { ...CLIENT_BOOKED, depositAmount: 6 };
      t.bookings.findByLink.mockResolvedValue(withDeposit);
      t.bookings.reschedulePendingOrBooked.mockResolvedValue({
        ...withDeposit,
        startsAt: new Date(NEW_START),
        endsAt: new Date('2026-01-02T15:30:00.000Z'),
      });

      const res = await patch({ startsAt: NEW_START }).expect(200);

      expect(res.body).toMatchObject({ depositAmount: 6, depositPaidAt: null });
    });

    it('deja PENDING un Turno cuando el Servicio pide Aprobación manual', async () => {
      t.services.findById.mockResolvedValue({ ...ANAS_SERVICE, requiresApproval: true });

      await patch({ startsAt: NEW_START }).expect(200);

      expect(t.bookings.reschedulePendingOrBooked).toHaveBeenCalledWith(
        BOOKED.id,
        expect.objectContaining({ status: BookingStatus.PENDING }),
        expect.any(Date),
      );
    });

    describe('con Empleado elegido', () => {
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
        t.bookings.findByLink.mockResolvedValue({ ...CLIENT_BOOKED, employeeChosen: true });
        t.services.findById.mockResolvedValue({
          ...ANAS_SERVICE,
          employees: [...ANAS_SERVICE.employees, JUAN],
        });
      });

      it('se queda con su Empleado a un horario en el que está libre', async () => {
        t.bookings.lastReceivedByEmployee.mockResolvedValue(
          new Map([[ANAS_EMPLOYEE.id, new Date('2026-01-01T10:00:00.000Z')]]),
        );

        await patch({ startsAt: NEW_START }).expect(200);

        expect(t.bookings.reschedulePendingOrBooked).toHaveBeenCalledWith(
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
        expect(t.bookings.reschedulePendingOrBooked).not.toHaveBeenCalled();
      });

      it('si su Empleado dejó de Ofrecer el Servicio responde 422', async () => {
        t.services.findById.mockResolvedValue({ ...ANAS_SERVICE, employees: [JUAN] });

        await patch({ startsAt: NEW_START }).expect(422);
        expect(t.bookings.reschedulePendingOrBooked).not.toHaveBeenCalled();
      });

      it('sin Empleado elegido un Turno sí pasa a otro Empleado libre', async () => {
        t.bookings.findByLink.mockResolvedValue(CLIENT_BOOKED);
        t.bookings.listOccupiedByUser.mockImplementation(async (userId) =>
          userId === ANAS_EMPLOYEE.userId ? busyAtNewStart : [],
        );

        await patch({ startsAt: NEW_START }).expect(200);

        expect(t.bookings.reschedulePendingOrBooked).toHaveBeenCalledWith(
          BOOKED.id,
          expect.objectContaining({ employeeId: JUAN.id }),
          expect.any(Date),
        );
      });
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

  describe('PATCH /booking-links/:secret/employee-no-show', () => {
    const patch = () => t.http.patch(`/booking-links/${LINK}/employee-no-show`);
    const HOUR_MS = 60 * 60 * 1000;
    const untilStart = () => BOOKED.startsAt.getTime() - t.clock.now().getTime();
    const untilEnd = () => BOOKED.endsAt.getTime() - t.clock.now().getTime();

    beforeEach(() => {
      t.bookings.findByLink.mockResolvedValue(CLIENT_BOOKED);
      t.bookings.markEmployeeNoShow.mockImplementation(async () => ({
        ...CLIENT_BOOKED,
        employeeNoShowAt: t.clock.now(),
      }));
    });

    it('marks the Falta del Empleado from the start of the Turno', async () => {
      t.clock.advance(untilStart());

      const res = await patch().expect(200);

      expect(t.bookings.markEmployeeNoShow).toHaveBeenCalledWith(BOOKED.id, t.clock.now());
      expect(res.body).toMatchObject({
        id: BOOKED.id,
        status: 'BOOKED',
        employeeNoShowAt: t.clock.now().toISOString(),
      });
    });

    it('marks it up to 24 hours after the Turno ends', async () => {
      t.clock.advance(untilEnd() + 24 * HOUR_MS);

      await patch().expect(200);
    });

    it('answers 422 one millisecond before the Turno starts', async () => {
      t.clock.advance(untilStart() - 1);

      const res = await patch().expect(422);

      expect(res.body.message).toBe('Turno has not started yet');
      expect(t.bookings.markEmployeeNoShow).not.toHaveBeenCalled();
    });

    it('answers 422 one millisecond after the window closes', async () => {
      t.clock.advance(untilEnd() + 24 * HOUR_MS + 1);

      const res = await patch().expect(422);

      expect(res.body.message).toBe('Employee no-show window closed');
      expect(t.bookings.markEmployeeNoShow).not.toHaveBeenCalled();
    });

    it.each([BookingStatus.PENDING, BookingStatus.REJECTED, BookingStatus.CANCELLED])(
      'answers 422 when the Turno is %s',
      async (status) => {
        t.clock.advance(untilEnd());
        t.bookings.findByLink.mockResolvedValue({ ...CLIENT_BOOKED, status });

        const res = await patch().expect(422);

        expect(res.body.message).toBe('Turno is not booked');
        expect(t.bookings.markEmployeeNoShow).not.toHaveBeenCalled();
      },
    );

    it('answers 422 when the Turno has an Ausencia', async () => {
      t.clock.advance(untilEnd());
      t.bookings.findByLink.mockResolvedValue({
        ...CLIENT_BOOKED,
        noShowAt: t.clock.now(),
      });

      const res = await patch().expect(422);

      expect(res.body.message).toBe('Turno has an Ausencia');
    });

    it('answers 422 when the Falta del Empleado is already marked', async () => {
      t.clock.advance(untilEnd());
      t.bookings.findByLink.mockResolvedValue({
        ...CLIENT_BOOKED,
        employeeNoShowAt: t.clock.now(),
      });

      const res = await patch().expect(422);

      expect(res.body.message).toBe('Employee no-show already marked');
    });

    it('answers 422 when a race changes the Turno between the read and the write', async () => {
      t.clock.advance(untilEnd());
      t.bookings.markEmployeeNoShow.mockRejectedValue(
        new BusinessRuleError('Employee no-show not allowed for this Turno'),
      );

      const res = await patch().expect(422);

      expect(res.body.message).toBe('Employee no-show not allowed for this Turno');
    });

    it('answers 404 for an unknown link', async () => {
      t.bookings.findByLink.mockRejectedValue(new NotFoundError('Turno not found'));

      const res = await patch().expect(404);

      expect(res.body.message).toBe('Turno not found');
    });

    it('works the same in a Servicio personal', async () => {
      t.clock.advance(untilEnd());
      t.bookings.findByLink.mockResolvedValue({
        ...CLIENT_BOOKED,
        employeeId: null,
        business: null,
        branch: null,
        user: { slug: 'ana' },
      });

      await patch().expect(200);
    });
  });

  describe('canMarkEmployeeNoShow', () => {
    const get = () => t.http.get(`/booking-links/${LINK}`);

    it('is false before the Turno starts', async () => {
      t.bookings.findByLink.mockResolvedValue(CLIENT_BOOKED);

      const res = await get().expect(200);

      expect(res.body).toMatchObject({ canMarkEmployeeNoShow: false, employeeNoShowAt: null });
    });

    it('is true inside the window and false once marked', async () => {
      t.clock.advance(BOOKED.endsAt.getTime() - t.clock.now().getTime());
      t.bookings.findByLink.mockResolvedValue(CLIENT_BOOKED);
      expect((await get().expect(200)).body.canMarkEmployeeNoShow).toBe(true);

      t.bookings.findByLink.mockResolvedValue({
        ...CLIENT_BOOKED,
        employeeNoShowAt: t.clock.now(),
      });
      const res = await get().expect(200);

      expect(res.body).toMatchObject({
        canMarkEmployeeNoShow: false,
        employeeNoShowAt: t.clock.now().toISOString(),
      });
    });

    it('is false when the Turno has an Ausencia, without exposing it', async () => {
      t.clock.advance(BOOKED.endsAt.getTime() - t.clock.now().getTime());
      t.bookings.findByLink.mockResolvedValue({ ...CLIENT_BOOKED, noShowAt: t.clock.now() });

      const res = await get().expect(200);

      expect(res.body.canMarkEmployeeNoShow).toBe(false);
      expect(res.body).not.toHaveProperty('noShowAt');
    });
  });

  describe('POST /booking-links/:secret/rating', () => {
    const post = (body: object) => t.http.post(`/booking-links/${LINK}/rating`).send(body);
    const afterEnd = () => t.clock.advance(BOOKED.endsAt.getTime() - t.clock.now().getTime() + 1);

    beforeEach(() => {
      t.bookings.findByLink.mockResolvedValue(CLIENT_BOOKED);
      t.bookings.rate.mockImplementation(async (_id, score, comment) => ({
        ...CLIENT_BOOKED,
        rating: { score, comment, createdAt: t.clock.now() },
      }));
    });

    it('rates an attended Turno and answers 201 with the Calificación', async () => {
      afterEnd();

      const res = await post({ score: 5, comment: 'Excelente' }).expect(201);

      expect(t.bookings.rate).toHaveBeenCalledWith(BOOKED.id, 5, 'Excelente');
      expect(res.body).toMatchObject({
        canRate: false,
        rating: { score: 5, comment: 'Excelente', createdAt: t.clock.now().toISOString() },
      });
    });

    it.each([undefined, '', '   '])('saves null for the comment %j', async (comment) => {
      afterEnd();

      await post({ score: 3, comment }).expect(201);

      expect(t.bookings.rate).toHaveBeenCalledWith(BOOKED.id, 3, null);
    });

    it.each([0, 6, 3.5, '4', null])('answers 400 for score %j', async (score) => {
      afterEnd();

      await post({ score }).expect(400);

      expect(t.bookings.rate).not.toHaveBeenCalled();
    });

    it('answers 400 for a comment over 500 characters, and accepts exactly 500', async () => {
      afterEnd();

      await post({ score: 4, comment: 'a'.repeat(501) }).expect(400);
      await post({ score: 4, comment: 'a'.repeat(500) }).expect(201);
    });

    it('answers 404 for an unknown link', async () => {
      t.bookings.findByLink.mockRejectedValue(new NotFoundError('Turno not found'));

      const res = await post({ score: 5 }).expect(404);

      expect(res.body.message).toBe('Turno not found');
    });

    it('answers 422 at the very moment the Turno ends, and 201 one millisecond later', async () => {
      t.clock.advance(BOOKED.endsAt.getTime() - t.clock.now().getTime());
      const res = await post({ score: 5 }).expect(422);
      expect(res.body.message).toBe('Turno cannot be rated');

      t.clock.advance(1);
      await post({ score: 5 }).expect(201);
    });

    it.each([BookingStatus.PENDING, BookingStatus.REJECTED, BookingStatus.CANCELLED])(
      'answers 422 when the Turno is %s',
      async (status) => {
        afterEnd();
        t.bookings.findByLink.mockResolvedValue({ ...CLIENT_BOOKED, status });

        const res = await post({ score: 5 }).expect(422);

        expect(res.body.message).toBe('Turno cannot be rated');
        expect(t.bookings.rate).not.toHaveBeenCalled();
      },
    );

    it.each(['noShowAt', 'employeeNoShowAt'])('answers 422 when the Turno has %s', async (mark) => {
      afterEnd();
      t.bookings.findByLink.mockResolvedValue({ ...CLIENT_BOOKED, [mark]: t.clock.now() });

      const res = await post({ score: 5 }).expect(422);

      expect(res.body.message).toBe('Turno cannot be rated');
    });

    it('answers 409 when the Turno is already rated, and never overwrites it', async () => {
      afterEnd();
      t.bookings.findByLink.mockResolvedValue({
        ...CLIENT_BOOKED,
        rating: { score: 2, comment: null, createdAt: t.clock.now() },
      });

      const res = await post({ score: 5 }).expect(409);

      expect(res.body.message).toBe('Turno already rated');
      expect(t.bookings.rate).not.toHaveBeenCalled();
    });

    it('answers 409 when another request wins the race', async () => {
      afterEnd();
      t.bookings.rate.mockRejectedValue(new ConflictError('Turno already rated'));

      const res = await post({ score: 5 }).expect(409);

      expect(res.body.message).toBe('Turno already rated');
    });
  });

  describe('canRate and rating', () => {
    const get = () => t.http.get(`/booking-links/${LINK}`);

    it('is false before the Turno ends, true after, and false once rated', async () => {
      t.bookings.findByLink.mockResolvedValue(CLIENT_BOOKED);
      expect((await get().expect(200)).body).toMatchObject({ canRate: false, rating: null });

      t.clock.advance(BOOKED.endsAt.getTime() - t.clock.now().getTime() + 1);
      expect((await get().expect(200)).body.canRate).toBe(true);

      const rating = { score: 4, comment: null, createdAt: t.clock.now() };
      t.bookings.findByLink.mockResolvedValue({ ...CLIENT_BOOKED, rating });
      expect((await get().expect(200)).body).toMatchObject({
        canRate: false,
        rating: { score: 4, comment: null, createdAt: rating.createdAt.toISOString() },
      });
    });

    it.each([BookingStatus.PENDING, BookingStatus.REJECTED, BookingStatus.CANCELLED])(
      'is false when the Turno is %s',
      async (status) => {
        t.clock.advance(BOOKED.endsAt.getTime() - t.clock.now().getTime() + 1);
        t.bookings.findByLink.mockResolvedValue({ ...CLIENT_BOOKED, status });

        expect((await get().expect(200)).body.canRate).toBe(false);
      },
    );

    it.each(['noShowAt', 'employeeNoShowAt'])('is false when the Turno has %s', async (mark) => {
      t.clock.advance(BOOKED.endsAt.getTime() - t.clock.now().getTime() + 1);
      t.bookings.findByLink.mockResolvedValue({ ...CLIENT_BOOKED, [mark]: t.clock.now() });

      expect((await get().expect(200)).body.canRate).toBe(false);
    });
  });
});
