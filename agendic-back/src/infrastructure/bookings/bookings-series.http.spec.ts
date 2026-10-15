import { Availability } from '../../domain/availabilities/availability';
import { Booking, BookingStatus } from '../../domain/bookings/booking';
import { SeriesBookingData } from '../../domain/bookings/bookings.repository';
import { ConflictError } from '../../domain/errors';
import {
  ANAS_BRANCH,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  createTestApp,
  TestApp,
  workWeek,
} from '../../test-app';

const SERVICE = { ...ANAS_SERVICE, repeatEveryWeeks: 1, repeatMaxBookings: 4 };
const AVAILABILITY: Availability = {
  id: 10,
  userId: ANAS_EMPLOYEE.userId,
  name: 'Horas laborables',
  timeZone: ANAS_BRANCH.timeZone,
  isDefault: true,
  schedule: workWeek('09:00', '18:00'),
  overrides: [],
};
const BEA = { ...SERVICE.employees[0], id: 2, userId: 99, name: 'Bea', slug: 'bea' };

/** Mondays 09:00 in Buenos Aires. */
const MONDAYS = ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'];
const at = (date: string) => `${date}T12:00:00.000Z`;
const SERIES_ID = '6f1b6c0e-3c58-4a39-9d62-6a9f6f9c2f10';

const REQUEST = {
  serviceId: SERVICE.id,
  startsAt: at(MONDAYS[0]),
  clientName: 'Bruno Díaz',
  clientEmail: 'bruno@example.com',
  code: 'A2B3C4',
  repeat: { count: 4 },
};

/** What the repository answers: every Turno of the call, with a link of its own. */
const created = (items: SeriesBookingData[]): Booking[] =>
  items.map(({ data }, i) => ({
    id: i + 1,
    ...data,
    cabinId: items[i].cabinIds[0] ?? null,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    notes: data.notes,
    noShowAt: null,
    employeeNoShowAt: null,
    link: `link-${i + 1}`,
    fromRescheduleId: null,
    seriesId: SERIES_ID,
    depositPaidAt: null,
    cancelledBy: null,
    cancellationReason: null,
    cancelledAt: null,
    rejectedAt: null,
  }));

describe('POST /bookings con repeat (Reservar una Serie)', () => {
  let t: TestApp;
  const post = (body: object = REQUEST) => t.http.post('/bookings').send(body);

  beforeEach(async () => {
    t = await createTestApp();
    t.services.findById.mockResolvedValue(SERVICE);
    t.branches.findById.mockResolvedValue(ANAS_BRANCH);
    t.availabilities.findById.mockResolvedValue(AVAILABILITY);
    t.bookings.listOccupiedByUser.mockResolvedValue([]);
    t.bookings.lastReceivedByEmployee.mockResolvedValue(new Map());
    t.bookings.lastReceivedByCabin.mockResolvedValue(new Map());
    t.bookings.createSeries.mockImplementation(async (items) => created(items));
  });
  afterEach(() => t.app.close());

  it('crea un Turno por fecha con el mismo Empleado, y responde el primero con la Serie', async () => {
    const res = await post().expect(201);

    const items = t.bookings.createSeries.mock.calls[0][0];
    expect(items.map(({ data }) => data.startsAt)).toEqual(
      MONDAYS.map((date) => new Date(at(date))),
    );
    expect(items.every(({ data }) => data.employeeId === ANAS_EMPLOYEE.id)).toBe(true);
    expect(items.every(({ data }) => !data.employeeChosen)).toBe(true);
    expect(res.body).toMatchObject({
      id: 1,
      startsAt: at(MONDAYS[0]),
      status: 'BOOKED',
      employeeName: ANAS_EMPLOYEE.name,
      link: 'link-1',
      seriesId: SERIES_ID,
      series: {
        id: SERIES_ID,
        bookings: MONDAYS.map((date, i) => ({ startsAt: at(date), link: `link-${i + 1}` })),
      },
    });
  });

  it('manda una sola Confirmación de reserva, con todas las fechas y el Enlace de cada Turno', async () => {
    await post().expect(201);

    expect(t.mailer.sendBookingConfirmation).toHaveBeenCalledTimes(1);
    expect(t.mailer.sendBookingConfirmation).toHaveBeenCalledWith(
      REQUEST.clientEmail,
      'link-1',
      null,
      {
        bookings: MONDAYS.map((date, i) => ({ startsAt: new Date(at(date)), link: `link-${i + 1}` })),
        timeZone: ANAS_BRANCH.timeZone,
      },
    );
  });

  it('si el mail falla, la Serie igual queda creada', async () => {
    t.mailer.sendBookingConfirmation.mockRejectedValue(new Error('SMTP down'));

    const res = await post().expect(201);

    expect(res.body.series.bookings).toHaveLength(4);
  });

  it('con skipDates crea los que quedan', async () => {
    const res = await post({ ...REQUEST, repeat: { count: 4, skipDates: [MONDAYS[1]] } }).expect(201);

    const items = t.bookings.createSeries.mock.calls[0][0];
    expect(items.map(({ date }) => date)).toEqual([MONDAYS[0], MONDAYS[2], MONDAYS[3]]);
    expect(res.body.series.bookings).toHaveLength(3);
  });

  it('un solo Código de verificación para toda la Serie', async () => {
    await post().expect(201);

    expect(t.bookingCodes.verify).toHaveBeenCalledTimes(1);
  });

  it('con Aprobación manual nacen todos PENDING', async () => {
    t.services.findById.mockResolvedValue({ ...SERVICE, requiresApproval: true });

    await post().expect(201);

    const items = t.bookings.createSeries.mock.calls[0][0];
    expect(items.every(({ data }) => data.status === BookingStatus.PENDING)).toBe(true);
    expect(items.every(({ data }) => data.acceptedAt === null)).toBe(true);
  });

  it('cada Turno fija el precio y la Seña', async () => {
    t.services.findById.mockResolvedValue({ ...SERVICE, price: 10.05, depositPercent: 15 });

    await post().expect(201);

    const items = t.bookings.createSeries.mock.calls[0][0];
    expect(items.every(({ data }) => data.price === 10.05 && data.depositAmount === 1.51)).toBe(true);
  });

  it('con Empleado elegido todos quedan con employeeChosen', async () => {
    t.services.findById.mockResolvedValue({ ...SERVICE, employees: [...SERVICE.employees, BEA] });

    await post({ ...REQUEST, employeeId: BEA.id }).expect(201);

    const items = t.bookings.createSeries.mock.calls[0][0];
    expect(items.every(({ data }) => data.employeeId === BEA.id && data.userId === BEA.userId)).toBe(true);
    expect(items.every(({ data }) => data.employeeChosen)).toBe(true);
  });

  it('le da a cada Turno las Cabinas libres en su tramo, en el orden de la regla', async () => {
    t.services.findById.mockResolvedValue({
      ...SERVICE,
      cabins: [
        { id: 10, name: 'Box 1' },
        { id: 11, name: 'Box 2' },
      ],
    });
    t.bookings.listOccupiedByCabins.mockImplementation(async (_ids, from) =>
      from.getTime() === new Date(at(MONDAYS[1])).getTime()
        ? [{ cabinId: 10, prepStartsAt: from, endsAt: new Date(from.getTime() + 30 * 60_000) }]
        : [],
    );
    t.bookings.lastReceivedByCabin.mockResolvedValue(
      new Map([[10, new Date('2025-12-01T00:00:00.000Z')], [11, new Date('2025-12-10T00:00:00.000Z')]]),
    );

    await post().expect(201);

    expect(t.bookings.createSeries.mock.calls[0][0].map(({ cabinIds }) => cabinIds)).toEqual([
      [10, 11],
      [11],
      [10, 11],
      [10, 11],
    ]);
  });

  describe('409', () => {
    it('con las fechas que chocan, sin crear nada', async () => {
      t.bookings.listOccupiedByUser.mockResolvedValue([
        { prepStartsAt: new Date(at(MONDAYS[1])), endsAt: new Date('2026-01-12T12:30:00.000Z') },
        { prepStartsAt: new Date(at(MONDAYS[3])), endsAt: new Date('2026-01-26T12:30:00.000Z') },
      ]);

      const res = await post().expect(409);

      expect(res.body.message).toBe(`Series dates not available: ${MONDAYS[1]},${MONDAYS[3]}`);
      expect(t.bookings.createSeries).not.toHaveBeenCalled();
    });

    it('el reintento con esas fechas en skipDates y el mismo código crea los que quedan', async () => {
      t.bookings.listOccupiedByUser.mockResolvedValue([
        { prepStartsAt: new Date(at(MONDAYS[1])), endsAt: new Date('2026-01-12T12:30:00.000Z') },
      ]);
      await post().expect(409);

      await post({ ...REQUEST, repeat: { count: 4, skipDates: [MONDAYS[1]] } }).expect(201);

      expect(t.bookingCodes.verify).toHaveBeenCalledTimes(2);
      expect(t.bookings.createSeries.mock.calls[0][0].map(({ date }) => date)).toEqual([
        MONDAYS[0],
        MONDAYS[2],
        MONDAYS[3],
      ]);
    }, 30_000);

    it('si el repositorio encuentra un choque que la lectura no vio', async () => {
      t.bookings.createSeries.mockRejectedValue(
        new ConflictError(`Series dates not available: ${MONDAYS[2]}`),
      );

      const res = await post().expect(409);

      expect(res.body.message).toBe(`Series dates not available: ${MONDAYS[2]}`);
      expect(t.mailer.sendBookingConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('errores', () => {
    it.each([1, 5, 'muchos'])('400 si count es %s', async (count) => {
      const res = await post({ ...REQUEST, repeat: { count } }).expect(400);

      expect(res.body.message).toBe('count must be between 2 and 4');
    });

    it('400 con el mismo mensaje si count falta', async () => {
      const res = await post({ ...REQUEST, repeat: {} }).expect(400);

      expect(res.body.message).toBe('count must be between 2 and 4');
    });

    it('400 si una fecha de skipDates no es de la Serie', async () => {
      const res = await post({ ...REQUEST, repeat: { count: 4, skipDates: ['2026-02-02'] } }).expect(400);

      expect(res.body.message).toBe('skipDates are not dates of the Serie: 2026-02-02');
    });

    it('400 si una fecha de skipDates no tiene el formato', async () => {
      await post({ ...REQUEST, repeat: { count: 4, skipDates: ['mañana'] } }).expect(400);
    });

    it('422 si quedan menos de 2 Turnos', async () => {
      const res = await post({
        ...REQUEST,
        repeat: { count: 3, skipDates: [MONDAYS[1], MONDAYS[2]] },
      }).expect(422);

      expect(res.body.message).toBe('A Serie needs at least 2 Turnos');
      expect(t.bookings.createSeries).not.toHaveBeenCalled();
    });

    it('422 si el Servicio no tiene Repetición', async () => {
      t.services.findById.mockResolvedValue(ANAS_SERVICE);

      const res = await post().expect(422);

      expect(res.body.message).toBe(`Service ${SERVICE.id} has no Repetición`);
    });

    it('400 si el código no es válido', async () => {
      t.bookingCodes.verify.mockReturnValue(false);

      await post().expect(400);
      expect(t.bookings.createSeries).not.toHaveBeenCalled();
    });

    it('sin repeat reserva un Turno suelto como siempre', async () => {
      t.bookings.create.mockResolvedValue({
        id: 1,
        serviceId: SERVICE.id,
        employeeId: ANAS_EMPLOYEE.id,
        startsAt: new Date(REQUEST.startsAt),
        endsAt: new Date('2026-01-05T12:30:00.000Z'),
        status: BookingStatus.BOOKED,
        link: 'link-1',
        seriesId: null,
      } as Booking);
      const { repeat: _repeat, ...single } = REQUEST;

      await post(single).expect(201);

      expect(t.bookings.createSeries).not.toHaveBeenCalled();
      expect(t.bookings.create).toHaveBeenCalled();
    });
  });
});
