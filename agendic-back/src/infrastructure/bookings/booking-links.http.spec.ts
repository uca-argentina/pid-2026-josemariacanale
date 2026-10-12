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
  link: LINK,
  employeeChosen: false,
  depositAmount: null,
  depositPaidAt: null,
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

      expect(t.bookings.cancelPendingOrBooked).toHaveBeenCalledWith(BOOKED.id);
      expect(res.body).toMatchObject({ id: BOOKED.id, status: 'CANCELLED' });
      expect(t.mailer.sendBookingCancellation).toHaveBeenCalledWith(
        BOOKED.clientEmail,
        BOOKED.link,
      );
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
      });
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
});
