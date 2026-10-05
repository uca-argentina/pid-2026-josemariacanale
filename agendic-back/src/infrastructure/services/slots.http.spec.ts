import { Availability } from '../../domain/availabilities/availability';
import { EmployeeService } from '../../domain/services/service';
import {
  ANAS_BRANCH,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  createTestApp,
  TestApp,
  workWeek,
} from '../../test-app';

const BRANCH = ANAS_BRANCH; // opensAt 09:00, closesAt 18:00, America/Argentina/Buenos_Aires
const SERVICE = ANAS_SERVICE; // durationMinutes 30

const LINK: EmployeeService = {
  serviceId: SERVICE.id,
  employeeId: ANAS_EMPLOYEE.id,
  availabilityId: 10,
};

/** Monday to Friday, 09:00–18:00. 2026-01-02 is a Friday; 2026-01-03/04 is the weekend. */
const AVAILABILITY: Availability = {
  id: LINK.availabilityId,
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
    slotsPath({ employeeId: ANAS_EMPLOYEE.id, from: '2026-01-02', to: '2026-01-02', ...params }),
  );

describe('GET /services/:id/slots', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    t.services.findById.mockResolvedValue(SERVICE);
    t.services.findEmployeeLink.mockResolvedValue(LINK);
    t.branches.findById.mockResolvedValue(BRANCH);
    t.availabilities.findById.mockResolvedValue(AVAILABILITY);
    t.bookings.listOccupiedByEmployee.mockResolvedValue([]);
  });
  afterEach(() => t.app.close());

  it('grillas horarios de a 15 minutos, el último terminando justo en el fin de la Franja', async () => {
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
    expect(day.slots).not.toContain('2026-01-02T20:45:00.000Z'); // would end at 18:15
    expect(day.slots).toHaveLength(35);
  });

  it('un Servicio oculto tiene Horarios reservables igual que uno visible', async () => {
    t.services.findById.mockResolvedValue({ ...SERVICE, hidden: true });

    const res = await query(t, {}).expect(200);

    expect(res.body.days[0].slots).toHaveLength(35);
  });

  it('descuenta un Turno tomado, en cualquier Servicio del mismo Empleado', async () => {
    t.bookings.listOccupiedByEmployee.mockResolvedValue([
      { prepStartsAt: new Date('2026-01-02T14:00:00.000Z'), endsAt: new Date('2026-01-02T14:30:00.000Z') },
    ]);

    const res = await query(t, {}).expect(200);

    const [day] = res.body.days;
    expect(day.slots).not.toContain('2026-01-02T14:00:00.000Z'); // inside the booking
    expect(day.slots).not.toContain('2026-01-02T14:15:00.000Z'); // would end inside the booking
    expect(day.slots).toContain('2026-01-02T13:15:00.000Z'); // ends exactly when the booking starts
    expect(day.slots).toContain('2026-01-02T14:30:00.000Z'); // starts exactly when the booking ends
    expect(t.bookings.listOccupiedByEmployee).toHaveBeenCalledWith(
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
      expect(day.slots[0]).toBe('2026-01-02T12:15:00.000Z'); // 09:15 ARG: 09:00 to 09:15 is preparation
      expect(day.slots.at(-1)).toBe('2026-01-02T20:30:00.000Z'); // 17:30 ARG, ends 18:00
      expect(day.slots).toHaveLength(34);
    });

    it('un Turno tomado bloquea también su preparación', async () => {
      t.bookings.listOccupiedByEmployee.mockResolvedValue([
        // 11:00 to 11:30 ARG, with 15 minutes of preparation from 10:45
        { prepStartsAt: new Date('2026-01-02T13:45:00.000Z'), endsAt: new Date('2026-01-02T14:30:00.000Z') },
      ]);

      const res = await query(t, {}).expect(200);

      const [day] = res.body.days;
      expect(day.slots).not.toContain('2026-01-02T13:30:00.000Z'); // would end inside the preparation
      expect(day.slots).toContain('2026-01-02T13:15:00.000Z'); // ends exactly when the preparation starts
    });

    it('la preparación del Servicio pedido no puede pisar un Turno tomado, de cualquier Servicio del Empleado', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, prepMinutes: 15 });
      t.bookings.listOccupiedByEmployee.mockResolvedValue([
        { prepStartsAt: new Date('2026-01-02T14:00:00.000Z'), endsAt: new Date('2026-01-02T14:30:00.000Z') },
      ]);

      const res = await query(t, {}).expect(200);

      const [day] = res.body.days;
      expect(day.slots).not.toContain('2026-01-02T14:30:00.000Z'); // its preparation would start at 14:15
      expect(day.slots).toContain('2026-01-02T14:45:00.000Z'); // its preparation starts exactly at 14:30
      expect(day.slots).not.toContain('2026-01-02T13:45:00.000Z'); // would end at 14:15, inside the Turno
      expect(day.slots).toContain('2026-01-02T13:30:00.000Z'); // ends exactly when the Turno's preparation starts
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

      expect(res.body.days[0].slots).toHaveLength(35);
    });

    it('cuenta el día en la zona horaria de la Sucursal', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, dailyLimit: 1 });
      // 2026-01-03T02:00Z is still Friday 2026-01-02 at 23:00 in Buenos Aires; 2026-01-02T02:00Z is Thursday.
      t.bookings.listOccupiedStartsByService.mockResolvedValue([
        new Date('2026-01-02T02:00:00.000Z'),
      ]);
      const notFull = await query(t, {}).expect(200);
      expect(notFull.body.days[0].slots).toHaveLength(35);

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

    expect(res.body.days[0].slots).toHaveLength(35);
  });

  it('el recorte contra la Sucursal achica el día, sin tocar la Availability', async () => {
    t.availabilities.findById.mockResolvedValue({
      ...AVAILABILITY,
      schedule: workWeek('08:00', '19:00'),
    });

    const res = await query(t, {}).expect(200);

    const [day] = res.body.days;
    expect(day.slots[0]).toBe('2026-01-02T12:00:00.000Z'); // 09:00 ARG, not 08:00
    expect(day.slots.at(-1)).toBe('2026-01-02T20:30:00.000Z'); // 17:30 ARG, ends 18:00
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
      t.bookings.listOccupiedByEmployee.mockResolvedValue([
        { prepStartsAt: new Date('2026-01-02T00:00:00.000Z'), endsAt: new Date('2026-01-03T00:00:00.000Z') },
      ]);

    const res = await query(t, { from: date, to: date }).expect(200);

    expect(res.body.days).toEqual([{ date, slots: [], reason }]);
  });

  it('lee las Franjas en la zona de la Availability, no en la de la Sucursal', async () => {
    t.branches.findById.mockResolvedValue({ ...BRANCH, opensAt: '00:00', closesAt: '23:59' });
    t.availabilities.findById.mockResolvedValue({
      ...AVAILABILITY,
      timeZone: 'America/New_York', // UTC-5 in January
    });

    const res = await query(t, {}).expect(200);

    expect(res.body.timeZone).toBe('America/New_York');
    expect(res.body.days[0].slots[0]).toBe('2026-01-02T14:00:00.000Z'); // 09:00 EST
    expect(res.body.days[0].slots.at(-1)).toBe('2026-01-02T22:30:00.000Z'); // 17:30 EST
  });

  it('las horas de la Sucursal se leen en su propia zona, aunque la Availability sea de otra', async () => {
    t.availabilities.findById.mockResolvedValue({
      ...AVAILABILITY,
      timeZone: 'America/New_York',
    });

    const res = await query(t, {}).expect(200);

    // Branch is 09:00–18:00 ARG = 12:00Z–21:00Z; the Availability starts at 14:00Z.
    expect(res.body.days[0].slots[0]).toBe('2026-01-02T14:00:00.000Z');
    expect(res.body.days[0].slots.at(-1)).toBe('2026-01-02T20:30:00.000Z'); // ends 21:00Z = 18:00 ARG
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
      retiredAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await query(t, {}).expect(404);
  });

  it('answers 404 for an Empleado not in charge of the Servicio', async () => {
    t.services.findEmployeeLink.mockResolvedValue(null);

    await query(t, {}).expect(404);
  });

  it.each([
    ['a missing employeeId', { employeeId: undefined }],
    ['a missing from', { from: undefined }],
    ['a missing to', { to: undefined }],
    ['a malformed employeeId', { employeeId: 'not-a-number' }],
    ['a malformed from', { from: '01-01-2026' }],
    ['a malformed to', { to: 'not-a-date' }],
  ])('rejects %s with 400', async (_, override) => {
    const params: Record<string, string | number | undefined> = {
      employeeId: ANAS_EMPLOYEE.id,
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
