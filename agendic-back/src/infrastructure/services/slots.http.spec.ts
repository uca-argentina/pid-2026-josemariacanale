import { Availability } from '../../domain/availabilities/availability';
import { AvailabilityOverride } from '../../domain/availability-overrides/availability-override';
import { Branch } from '../../domain/branches/branch';
import { EmployeeService } from '../../domain/services/service';
import {
  ANAS_BRANCH,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  createTestApp,
  TestApp,
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
  employeeId: ANAS_EMPLOYEE.id,
  name: 'Horario general',
  isDefault: true,
  intervals: [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startTime: '09:00',
    endTime: '18:00',
  })),
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
    t.overrides.listByEmployee.mockResolvedValue([]);
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

  it('descuenta un Turno tomado, en cualquier Servicio del mismo Empleado', async () => {
    t.bookings.listOccupiedByEmployee.mockResolvedValue([
      { startsAt: new Date('2026-01-02T14:00:00.000Z'), endsAt: new Date('2026-01-02T14:30:00.000Z') },
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

  it('una Anulación sin horas deja el día sin horarios, con motivo NOT_WORKING', async () => {
    const dayOff: AvailabilityOverride = {
      employeeId: ANAS_EMPLOYEE.id,
      date: '2026-01-02',
      intervals: [],
      coveredByEmployeeId: null,
    };
    t.overrides.listByEmployee.mockResolvedValue([dayOff]);

    const res = await query(t, {}).expect(200);

    expect(res.body.days).toEqual([
      { date: '2026-01-02', slots: [], reason: 'NOT_WORKING' },
    ]);
  });

  it('una Anulación con horas reemplaza las Franjas del día, no las suma', async () => {
    const override: AvailabilityOverride = {
      employeeId: ANAS_EMPLOYEE.id,
      date: '2026-01-02',
      intervals: [{ startTime: '09:00', endTime: '10:00' }],
      coveredByEmployeeId: null,
    };
    t.overrides.listByEmployee.mockResolvedValue([override]);

    const res = await query(t, {}).expect(200);

    const [day] = res.body.days;
    // Only the override's Franja (09:00–10:00 ARG), not the Availability's 09:00–18:00.
    expect(day.slots).toContain('2026-01-02T12:00:00.000Z'); // 09:00 ARG
    expect(day.slots).not.toContain('2026-01-02T20:00:00.000Z'); // 17:00 ARG, outside the override
    expect(day.slots.at(-1)).toBe('2026-01-02T12:30:00.000Z'); // 09:30 ARG, ends at 10:00
  });

  it('el recorte contra la Sucursal achica el día, sin tocar la Availability', async () => {
    t.availabilities.findById.mockResolvedValue({
      ...AVAILABILITY,
      intervals: [1, 2, 3, 4, 5].map((weekday) => ({
        weekday,
        startTime: '08:00',
        endTime: '19:00',
      })),
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
        { startsAt: new Date('2026-01-02T00:00:00.000Z'), endsAt: new Date('2026-01-03T00:00:00.000Z') },
      ]);

    const res = await query(t, { from: date, to: date }).expect(200);

    expect(res.body.days).toEqual([{ date, slots: [], reason }]);
  });

  it('un día con Cobertura trae reason COVERED y coveredByEmployeeId, sin calcular horarios', async () => {
    const covered: AvailabilityOverride = {
      employeeId: ANAS_EMPLOYEE.id,
      date: '2026-01-02',
      intervals: [],
      coveredByEmployeeId: 7,
    };
    t.overrides.listByEmployee.mockResolvedValue([covered]);

    const res = await query(t, {}).expect(200);

    expect(res.body.days).toEqual([
      { date: '2026-01-02', slots: [], reason: 'COVERED', coveredByEmployeeId: 7 },
    ]);
    expect(t.availabilities.findById).toHaveBeenCalled(); // fetched, but never used to compute this day
  });

  it('una Sucursal en otra zona corre los instantes UTC, no las horas de reloj', async () => {
    const NY_BRANCH: Branch = { ...BRANCH, timeZone: 'America/New_York' }; // UTC-5 in January
    t.branches.findById.mockResolvedValue(NY_BRANCH);

    const res = await query(t, {}).expect(200);

    expect(res.body.timeZone).toBe('America/New_York');
    expect(res.body.days[0].slots[0]).toBe('2026-01-02T14:00:00.000Z'); // 09:00 EST = UTC-5
  });

  it('un rango que cruza el cambio de horario de verano mantiene la hora de reloj y corre el instante UTC', async () => {
    // Daylight Saving in Europe/Madrid starts Sunday 2026-03-29 (02:00 -> 03:00, CET -> CEST).
    // 2026-03-27 is a Friday (CET, UTC+1); 2026-03-30 is the following Monday (CEST, UTC+2).
    const MADRID_BRANCH: Branch = { ...BRANCH, timeZone: 'Europe/Madrid' };
    t.branches.findById.mockResolvedValue(MADRID_BRANCH);
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
