import { Availability } from '../../domain/availabilities/availability';
import {
  ANAS_BRANCH,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  createTestApp,
  TestApp,
  workWeek,
} from '../../test-app';

const BRANCH = ANAS_BRANCH; // America/Argentina/Buenos_Aires
const SERVICE = ANAS_SERVICE; // durationMinutes 30, so a start every 30 minutes

const AVAILABILITY_ID = 10;

/** Monday to Friday, 09:00–18:00. 2026-01-02 is a Friday; 2026-01-03/04 is the weekend. */
const AVAILABILITY: Availability = {
  id: AVAILABILITY_ID,
  userId: ANAS_EMPLOYEE.userId,
  name: 'Horas laborables',
  timeZone: BRANCH.timeZone,
  isDefault: true,
  schedule: workWeek('09:00', '18:00'),
  overrides: [],
};

const slotsPath = (params: Record<string, string | number>) =>
  `/services/${SERVICE.id}/slots?` +
  Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

const query = (t: TestApp, params: Record<string, string | number>) =>
  t.http.get(
    slotsPath({ from: '2026-01-02', to: '2026-01-02', ...params }),
  );

describe('GET /services/:id/slots', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    t.services.findById.mockResolvedValue(SERVICE);
    t.branches.findById.mockResolvedValue(BRANCH);
    t.availabilities.findById.mockResolvedValue(AVAILABILITY);
    t.bookings.listOccupiedByUser.mockResolvedValue([]);
  });
  afterEach(() => t.app.close());

  it('ofrece un Horario reservable cada duración del Servicio, el último terminando justo en el fin de la Franja', async () => {
    const res = await query(t, {}).expect(200);

    expect(res.body.timeZone).toBe(BRANCH.timeZone);
    expect(res.body.days).toEqual([
      {
        date: '2026-01-02',
        slots: expect.any(Array),
      },
    ]);
    const [day] = res.body.days;
    expect(day.slots[0]).toBe('2026-01-02T12:00:00.000Z'); // 09:00 ARG
    expect(day.slots.at(-1)).toBe('2026-01-02T20:30:00.000Z'); // 17:30 ARG, ends 18:00
    expect(day.slots).toHaveLength(18);
  });

  it('un Servicio oculto tiene Horarios reservables igual que uno visible', async () => {
    t.services.findById.mockResolvedValue({ ...SERVICE, hidden: true });

    const res = await query(t, {}).expect(200);

    expect(res.body.days[0].slots).toHaveLength(18);
  });

  it('descuenta un Turno tomado, en cualquier Servicio del mismo Empleado', async () => {
    t.bookings.listOccupiedByUser.mockResolvedValue([
      { prepStartsAt: new Date('2026-01-02T14:00:00.000Z'), endsAt: new Date('2026-01-02T14:30:00.000Z') },
    ]);

    const res = await query(t, {}).expect(200);

    const [day] = res.body.days;
    expect(day.slots).not.toContain('2026-01-02T14:00:00.000Z'); // inside the booking
    expect(day.slots).toContain('2026-01-02T13:30:00.000Z'); // ends exactly when the booking starts
    expect(day.slots).toContain('2026-01-02T14:30:00.000Z'); // starts exactly when the booking ends
    expect(t.bookings.listOccupiedByUser).toHaveBeenCalledWith(
      ANAS_EMPLOYEE.id,
      expect.any(Date),
      expect.any(Date),
      undefined,
    );
  });

  describe('Tiempo de preparación', () => {
    it('el primer Horario reservable de una Franja arranca después de la preparación', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, prepMinutes: 15 });

      const res = await query(t, {}).expect(200);

      const [day] = res.body.days;
      expect(day.slots[0]).toBe('2026-01-02T12:30:00.000Z'); // 09:30 ARG: 09:15 rounded up to the 30' alignment
      expect(day.slots.at(-1)).toBe('2026-01-02T20:30:00.000Z'); // 17:30 ARG, ends 18:00
      expect(day.slots).toHaveLength(17);
    });

    it('un Turno tomado bloquea también su preparación', async () => {
      t.bookings.listOccupiedByUser.mockResolvedValue([
        // 11:00 to 11:30 ARG, with 15 minutes of preparation from 10:45
        { prepStartsAt: new Date('2026-01-02T13:45:00.000Z'), endsAt: new Date('2026-01-02T14:30:00.000Z') },
      ]);

      const res = await query(t, {}).expect(200);

      const [day] = res.body.days;
      expect(day.slots).not.toContain('2026-01-02T13:30:00.000Z'); // would end inside the preparation
      expect(day.slots).toContain('2026-01-02T13:00:00.000Z'); // ends before the preparation starts
    });

    it('la preparación del Servicio pedido no puede pisar un Turno tomado, de cualquier Servicio del Empleado', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, prepMinutes: 15 });
      t.bookings.listOccupiedByUser.mockResolvedValue([
        { prepStartsAt: new Date('2026-01-02T14:00:00.000Z'), endsAt: new Date('2026-01-02T14:30:00.000Z') },
      ]);

      const res = await query(t, {}).expect(200);

      const [day] = res.body.days;
      expect(day.slots).not.toContain('2026-01-02T14:30:00.000Z'); // its preparation would start at 14:15
      expect(day.slots).toContain('2026-01-02T15:00:00.000Z'); // 14:30 plus preparation, rounded up to the alignment
      expect(day.slots).toContain('2026-01-02T13:30:00.000Z'); // ends exactly when the Turno starts
    });
  });

  describe('Límite diario', () => {
    it('alcanzado, el día no ofrece Horarios reservables', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, dailyLimit: 2 });
      t.bookings.listOccupiedStartsByService.mockResolvedValue([
        new Date('2026-01-02T13:00:00.000Z'),
        new Date('2026-01-02T18:00:00.000Z'),
      ]);

      const res = await query(t, {}).expect(200);

      expect(res.body.days).toEqual([
        { date: '2026-01-02', slots: [], reason: 'FULLY_BOOKED' },
      ]);
      expect(t.bookings.listOccupiedStartsByService).toHaveBeenCalledWith(
        SERVICE.id,
        expect.any(Date),
        expect.any(Date),
        undefined,
      );
    });

    it('sin alcanzarlo, el día ofrece sus horarios', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, dailyLimit: 2 });
      t.bookings.listOccupiedStartsByService.mockResolvedValue([
        new Date('2026-01-02T13:00:00.000Z'),
      ]);

      const res = await query(t, {}).expect(200);

      expect(res.body.days[0].slots).toHaveLength(18);
    });

    it('cuenta el día en la zona horaria de la Sucursal', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, dailyLimit: 1 });
      // 2026-01-03T02:00Z is still Friday 2026-01-02 at 23:00 in Buenos Aires; 2026-01-02T02:00Z is Thursday.
      t.bookings.listOccupiedStartsByService.mockResolvedValue([
        new Date('2026-01-02T02:00:00.000Z'),
      ]);
      const notFull = await query(t, {}).expect(200);
      expect(notFull.body.days[0].slots).toHaveLength(18);

      t.bookings.listOccupiedStartsByService.mockResolvedValue([
        new Date('2026-01-03T02:00:00.000Z'),
      ]);
      const full = await query(t, {}).expect(200);
      expect(full.body.days[0]).toEqual({
        date: '2026-01-02',
        slots: [],
        reason: 'FULLY_BOOKED',
      });
    });

    it('sin Límite diario no cuenta Turnos', async () => {
      await query(t, {}).expect(200);

      expect(t.bookings.listOccupiedStartsByService).not.toHaveBeenCalled();
    });
  });

  it('una Anulación sin horas deja el día sin horarios, con motivo NOT_WORKING', async () => {
    t.availabilities.findById.mockResolvedValue({
      ...AVAILABILITY,
      overrides: [{ date: '2026-01-02', ranges: [] }],
    });

    const res = await query(t, {}).expect(200);

    expect(res.body.days).toEqual([
      { date: '2026-01-02', slots: [], reason: 'NOT_WORKING' },
    ]);
  });

  it('una Anulación con horas reemplaza las Franjas del día, no las suma', async () => {
    t.availabilities.findById.mockResolvedValue({
      ...AVAILABILITY,
      overrides: [{ date: '2026-01-02', ranges: [{ start: '09:00', end: '10:00' }] }],
    });

    const res = await query(t, {}).expect(200);

    const [day] = res.body.days;
    // Only the override's Franja (09:00–10:00 ARG), not the Availability's 09:00–18:00.
    expect(day.slots).toContain('2026-01-02T12:00:00.000Z'); // 09:00 ARG
    expect(day.slots).not.toContain('2026-01-02T20:00:00.000Z'); // 17:00 ARG, outside the override
    expect(day.slots.at(-1)).toBe('2026-01-02T12:30:00.000Z'); // 09:30 ARG, ends at 10:00
  });

  it('una Anulación de otra fecha no toca el día', async () => {
    t.availabilities.findById.mockResolvedValue({
      ...AVAILABILITY,
      overrides: [{ date: '2026-01-05', ranges: [] }],
    });

    const res = await query(t, {}).expect(200);

    expect(res.body.days[0].slots).toHaveLength(18);
  });

  it('un día pasado no viene; los horarios de hoy anteriores al reloj no vienen', async () => {
    t.clock.advance(2 * 60 * 60 * 1000); // now: 2026-01-01T14:00:00.000Z = 11:00 ARG
    t.availabilities.findById.mockResolvedValue(AVAILABILITY);

    const res = await query(t, { from: '2025-12-31', to: '2026-01-02' }).expect(200);

    expect(res.body.days.map((d: { date: string }) => d.date)).toEqual([
      '2026-01-01',
      '2026-01-02',
    ]);
    const today = res.body.days.find((d: { date: string }) => d.date === '2026-01-01');
    expect(today.slots).not.toContain('2026-01-01T13:45:00.000Z'); // 10:45 ARG, before now
    expect(today.slots[0]).toBe('2026-01-01T14:00:00.000Z'); // 11:00 ARG, exactly now
  });

  it.each([
    ['sin Franjas ese día', '2026-01-03', 'NOT_WORKING'], // Saturday
    ['completamente reservado', '2026-01-02', 'FULLY_BOOKED'],
  ])('un día sin horarios trae su motivo: %s', async (_, date, reason) => {
    if (reason === 'FULLY_BOOKED')
      t.bookings.listOccupiedByUser.mockResolvedValue([
        { prepStartsAt: new Date('2026-01-02T00:00:00.000Z'), endsAt: new Date('2026-01-03T00:00:00.000Z') },
      ]);

    const res = await query(t, { from: date, to: date }).expect(200);

    expect(res.body.days).toEqual([{ date, slots: [], reason }]);
  });

  it('lee las Franjas en la zona de la Availability y agrupa el día en la de la Sucursal', async () => {
    t.availabilities.findById.mockResolvedValue({
      ...AVAILABILITY,
      timeZone: 'America/New_York', // UTC-5 in January
    });

    const res = await query(t, {}).expect(200);

    expect(res.body.timeZone).toBe(BRANCH.timeZone); // the day is the Sucursal's
    expect(res.body.days[0].slots[0]).toBe('2026-01-02T14:00:00.000Z'); // 09:00 EST
    expect(res.body.days[0].slots.at(-1)).toBe('2026-01-02T22:30:00.000Z'); // 17:30 EST
  });

  it('un rango que cruza el cambio de horario de verano mantiene la hora de reloj y corre el instante UTC', async () => {
    // Daylight Saving in Europe/Madrid starts Sunday 2026-03-29 (02:00 -> 03:00, CET -> CEST).
    // 2026-03-27 is a Friday (CET, UTC+1); 2026-03-30 is the following Monday (CEST, UTC+2).
    const MADRID = 'Europe/Madrid';
    t.branches.findById.mockResolvedValue({ ...BRANCH, timeZone: MADRID });
    t.availabilities.findById.mockResolvedValue({ ...AVAILABILITY, timeZone: MADRID });
    t.clock.advance(
      new Date('2026-03-27T00:00:00.000Z').getTime() -
        new Date('2026-01-01T12:00:00.000Z').getTime(),
    );

    const res = await query(t, { from: '2026-03-27', to: '2026-03-30' }).expect(200);

    const byDate = Object.fromEntries(
      res.body.days.map((d: { date: string; slots: string[] }) => [d.date, d.slots]),
    );
    expect(byDate['2026-03-27'][0]).toBe('2026-03-27T08:00:00.000Z'); // 09:00 CET = UTC+1
    expect(byDate['2026-03-30'][0]).toBe('2026-03-30T07:00:00.000Z'); // 09:00 CEST = UTC+2
  });

  describe('Intervalo y Anticipación mínima', () => {
    const FRANJA_9_A_13 = { ...AVAILABILITY, schedule: workWeek('09:00', '13:00') };

    it('sin Intervalo, un Servicio de 60 minutos con una Franja de 9 a 13 ofrece 9, 10, 11 y 12', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, durationMinutes: 60 });
      t.availabilities.findById.mockResolvedValue(FRANJA_9_A_13);

      const res = await query(t, {}).expect(200);

      expect(res.body.days[0].slots).toEqual([
        '2026-01-02T12:00:00.000Z',
        '2026-01-02T13:00:00.000Z',
        '2026-01-02T14:00:00.000Z',
        '2026-01-02T15:00:00.000Z',
      ]);
    });

    it('con Intervalo de 45 minutos se avanza de a 45', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, slotInterval: 45 });
      t.availabilities.findById.mockResolvedValue(FRANJA_9_A_13);

      const res = await query(t, {}).expect(200);

      expect(res.body.days[0].slots).toEqual([
        '2026-01-02T12:00:00.000Z', // 09:00
        '2026-01-02T12:45:00.000Z', // 09:45
        '2026-01-02T13:30:00.000Z', // 10:30
        '2026-01-02T14:15:00.000Z', // 11:15
        '2026-01-02T15:00:00.000Z', // 12:00, the next one (12:45) wouldn't fit
      ]);
    });

    it('aprovecha el hueco que deja un Turno: con Intervalo de 20, tras uno de 9:00 a 9:20 el primero es 9:20', async () => {
      t.services.findById.mockResolvedValue({
        ...SERVICE,
        durationMinutes: 20,
        slotInterval: 20,
      });
      t.availabilities.findById.mockResolvedValue({
        ...AVAILABILITY,
        schedule: workWeek('09:00', '12:00'),
      });
      t.bookings.listOccupiedByUser.mockResolvedValue([
        { prepStartsAt: new Date('2026-01-02T12:00:00.000Z'), endsAt: new Date('2026-01-02T12:20:00.000Z') },
      ]);

      const res = await query(t, {}).expect(200);

      expect(res.body.days[0].slots[0]).toBe('2026-01-02T12:20:00.000Z');
    });

    it('no ofrece nada antes de ahora más la Anticipación mínima', async () => {
      // now: 2026-01-01T12:00:00.000Z = 09:00 ARG
      t.services.findById.mockResolvedValue({ ...SERVICE, minimumNoticeMinutes: 125 });

      const res = await query(t, { from: '2026-01-01', to: '2026-01-01' }).expect(200);

      expect(res.body.days[0].slots[0]).toBe('2026-01-01T14:30:00.000Z'); // 11:05 rounded up to 11:30 ARG
    });

    it('una Franja hasta las 23:59 admite un Turno que termina a las 00:00', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, durationMinutes: 60 });
      t.availabilities.findById.mockResolvedValue({
        ...AVAILABILITY,
        schedule: workWeek('22:00', '23:59'),
      });

      const res = await query(t, {}).expect(200);

      expect(res.body.days[0].slots).toEqual([
        '2026-01-03T01:00:00.000Z', // 22:00 ARG
        '2026-01-03T02:00:00.000Z', // 23:00 ARG, ends at midnight
      ]);
    });
  });

  it('answers 422 for a range longer than 31 days', async () => {
    await query(t, { from: '2026-01-01', to: '2026-02-02' }).expect(422); // 33 days

    expect(t.services.findById).not.toHaveBeenCalled();
  });

  it('answers 422 when to is before from', async () => {
    await query(t, { from: '2026-01-05', to: '2026-01-01' }).expect(422);
  });

  it('accepts a 31-day range', async () => {
    await query(t, { from: '2026-01-01', to: '2026-01-31' }).expect(200);
  });

  it('answers 404 for an unknown Servicio', async () => {
    t.services.findById.mockResolvedValue(null);

    await query(t, {}).expect(404);
  });

  it('answers 404 for a Servicio dado de baja', async () => {
    t.services.findById.mockResolvedValue({
      ...SERVICE,
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await query(t, {}).expect(404);
  });

  describe('con varios Empleados', () => {
    const JUAN_ID = ANAS_EMPLOYEE.id + 1;
    const JUANS_AVAILABILITY: Availability = {
      ...AVAILABILITY,
      id: 11,
      userId: 99,
      schedule: workWeek('09:00', '10:00'),
    };

    beforeEach(() => {
      t.services.findById.mockResolvedValue({
        ...SERVICE,
        employees: [
          ...SERVICE.employees,
          {
            id: JUAN_ID,
            name: 'Juan',
            availabilityId: JUANS_AVAILABILITY.id,
            userId: JUANS_AVAILABILITY.userId,
            imageUrl: null,
          },
        ],
      });
      t.availabilities.findById.mockImplementation(async (id) =>
        id === JUANS_AVAILABILITY.id ? JUANS_AVAILABILITY : AVAILABILITY,
      );
    });

    it('ofrece la unión de los Horarios reservables de cada uno', async () => {
      const res = await query(t, {}).expect(200);

      expect(res.body.days[0].slots).toHaveLength(18); // Juan's 09:00–10:00 is inside Ana's day
      expect(t.bookings.listOccupiedByUser).toHaveBeenCalledTimes(2);
    });

    it('un horario ocupado para uno sigue ofrecido si el otro está libre', async () => {
      t.bookings.listOccupiedByUser.mockImplementation(async (userId) =>
        userId === ANAS_EMPLOYEE.userId
          ? [{ prepStartsAt: new Date('2026-01-02T12:00:00.000Z'), endsAt: new Date('2026-01-02T12:30:00.000Z') }]
          : [],
      );

      const res = await query(t, {}).expect(200);

      expect(res.body.days[0].slots).toContain('2026-01-02T12:00:00.000Z'); // Juan is free
    });

    it('si Ana tiene una Anulación de día libre y Juan no, ese día sale con los horarios de Juan', async () => {
      t.availabilities.findById.mockImplementation(async (id) =>
        id === JUANS_AVAILABILITY.id
          ? JUANS_AVAILABILITY
          : { ...AVAILABILITY, overrides: [{ id: 1, availabilityId: AVAILABILITY.id, date: '2026-01-02', ranges: [] }] },
      );

      const res = await query(t, {}).expect(200);

      expect(res.body.days[0].slots).toEqual([
        '2026-01-02T12:00:00.000Z',
        '2026-01-02T12:30:00.000Z',
      ]);
    });
  });

  it.each([
    ['a missing from', { from: undefined }],
    ['a missing to', { to: undefined }],
    ['a malformed from', { from: '01-01-2026' }],
    ['a malformed to', { to: 'not-a-date' }],
  ])('rejects %s with 400', async (_, override) => {
    const params: Record<string, string | number | undefined> = {
      from: '2026-01-02',
      to: '2026-01-02',
      ...override,
    };
    for (const key of Object.keys(params))
      if (params[key] === undefined) delete params[key];

    await t.http
      .get(slotsPath(params as Record<string, string | number>))
      .expect(400);
    expect(t.services.findById).not.toHaveBeenCalled();
  });
});
