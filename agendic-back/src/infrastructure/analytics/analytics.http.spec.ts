import {
  AnalyticsBreakdown,
  BookingRow,
  KPI_NAMES,
  KpiValues,
} from '../../domain/analytics/analytics.repository';
import { Availability } from '../../domain/availabilities/availability';
import { Service } from '../../domain/services/service';
import {
  ANA,
  ANAS_SERVICE,
  bearer,
  BRUNO,
  CLERK_TOKEN,
  createTestApp,
  scriptSession,
  TestApp,
  workWeek,
} from '../../test-app';

const DEFAULT_AVAILABILITY: Availability = {
  id: 1,
  userId: ANA.id,
  name: 'Horas laborables',
  timeZone: 'America/Argentina/Buenos_Aires',
  isDefault: true,
  schedule: workWeek('09:00', '17:00'),
  overrides: [],
};

const PERSONAL: Service = {
  ...ANAS_SERVICE,
  id: 7,
  branchId: null,
  userId: ANA.id,
  availabilityId: DEFAULT_AVAILABILITY.id,
};

/** A personal Servicio of another Usuario. */
const BRUNOS: Service = { ...PERSONAL, id: 8, userId: BRUNO.id };

const kpisOf = (value: number | null): KpiValues =>
  Object.fromEntries(KPI_NAMES.map((name) => [name, value])) as KpiValues;

const BREAKDOWN: AnalyticsBreakdown = {
  trend: [
    {
      bucket: '2026-03-01',
      booked: 1,
      attended: 0,
      rescheduled: 0,
      cancelled: 0,
      rejected: 0,
      noShows: 0,
      employeeNoShows: 0,
    },
  ],
  popularServices: [{ serviceId: 7, name: 'Corte', count: 4 }],
  recentRatings: [
    {
      score: 5,
      comment: null,
      createdAt: '2026-03-02T10:00:00.000Z',
      clientName: 'Cami',
      serviceName: 'Corte',
      employeeName: null,
    },
  ],
};

describe('GET /analytics/personal', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    t.availabilities.listByUser.mockResolvedValue([DEFAULT_AVAILABILITY]);
    t.services.findById.mockImplementation(
      async (id) =>
        [PERSONAL, BRUNOS, ANAS_SERVICE].find((s) => s.id === id) ?? null,
    );
    t.analytics.kpis.mockImplementation(async (_scope, range) =>
      kpisOf(range.from === '2026-03-01' ? 5 : 3),
    );
    t.analytics.breakdown.mockResolvedValue(BREAKDOWN);
    t.analytics.personalServices.mockResolvedValue([{ id: 7, name: 'Corte' }]);
  });
  afterEach(() => t.app.close());

  const get = (query: string) =>
    t.http.get(`/analytics/personal?${query}`).set(bearer(CLERK_TOKEN));

  it('answers every KPI with its current and previous value', async () => {
    const res = await get('from=2026-03-01&to=2026-03-10').expect(200);

    expect(Object.keys(res.body.kpis).sort()).toEqual([...KPI_NAMES].sort());
    expect(res.body.kpis.booked).toEqual({ current: 5, previous: 3 });
    expect(res.body.kpis.averageRating).toEqual({ current: 5, previous: 3 });
  });

  it('answers the trend, the ranking, the recent Calificaciones and the filter options next to the KPIs', async () => {
    const res = await get('from=2026-03-01&to=2026-03-10').expect(200);

    expect(res.body).toEqual({
      kpis: expect.any(Object),
      granularity: 'day',
      ...BREAKDOWN,
      filterOptions: { services: [{ id: 7, name: 'Corte' }] },
    });
  });

  it.each([
    ['2026-03-01', '2026-03-31', 'day'],
    ['2026-03-01', '2026-04-01', 'week'],
    ['2026-01-01', '2026-07-02', 'week'],
    ['2026-01-01', '2026-07-03', 'month'],
  ])('groups %s..%s by %s', async (from, to, granularity) => {
    const res = await get(`from=${from}&to=${to}`).expect(200);

    expect(res.body.granularity).toBe(granularity);
    expect(t.analytics.breakdown).toHaveBeenCalledWith(
      expect.anything(),
      { from, to },
      t.clock.now(),
      granularity,
      1,
      undefined,
    );
  });

  it('starts the weeks on the weekStart of the Usuario', async () => {
    t.users.findById.mockResolvedValue({ ...ANA, weekStart: 0 });

    await get('from=2026-03-01&to=2026-04-01').expect(200);

    expect(t.analytics.breakdown).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'week',
      0,
      undefined,
    );
  });

  it('passes serviceId to the breakdown but not to the filter options', async () => {
    await get('from=2026-03-01&to=2026-03-10&serviceId=7').expect(200);

    expect(t.analytics.breakdown).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'day',
      1,
      7,
    );
    expect(t.analytics.personalServices).toHaveBeenCalledWith(ANA.id);
  });

  it('answers null as null', async () => {
    t.analytics.kpis.mockResolvedValue({ ...kpisOf(1), csat: null });

    const res = await get('from=2026-03-01&to=2026-03-10').expect(200);

    expect(res.body.kpis.csat).toEqual({ current: null, previous: null });
  });

  it('asks the previous period with the same length in days, ending the day before `from`', async () => {
    await get('from=2026-03-01&to=2026-03-10').expect(200);

    const ranges = t.analytics.kpis.mock.calls.map(([, range]) => range);
    expect(ranges).toEqual([
      { from: '2026-03-01', to: '2026-03-10' },
      { from: '2026-02-19', to: '2026-02-28' },
    ]);
  });

  it('asks only for the Servicios personales of the Usuario of the Sesión, in the zone of their default Availability', async () => {
    await get('from=2026-03-01&to=2026-03-10').expect(200);

    expect(t.analytics.kpis).toHaveBeenCalledWith(
      {
        kind: 'personal',
        userId: ANA.id,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      expect.anything(),
      t.clock.now(),
      undefined,
    );
  });

  it('narrows to one Servicio personal with serviceId', async () => {
    await get('from=2026-03-01&to=2026-03-10&serviceId=7').expect(200);

    expect(t.analytics.kpis).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      7,
    );
  });

  it('is 401 without a Sesión', async () => {
    await t.http
      .get('/analytics/personal?from=2026-03-01&to=2026-03-10')
      .expect(401);
  });

  it.each([
    [
      'a malformed date',
      'from=2026-3-1&to=2026-03-10',
      'Invalid analytics range 2026-3-1..2026-03-10',
    ],
    [
      'a date that does not exist',
      'from=2026-02-31&to=2026-03-10',
      'Invalid analytics range 2026-02-31..2026-03-10',
    ],
    [
      'from after to',
      'from=2026-03-10&to=2026-03-01',
      'Invalid analytics range 2026-03-10..2026-03-01',
    ],
    [
      'more than 366 days',
      'from=2025-01-01&to=2026-03-01',
      'Invalid analytics range 2025-01-01..2026-03-01',
    ],
    [
      'a missing date',
      'from=2026-03-01',
      'Invalid analytics range 2026-03-01..undefined',
    ],
  ])('is 400 with %s', async (_name, query, message) => {
    const res = await get(query).expect(400);

    expect(res.body.message).toBe(message);
    expect(t.analytics.kpis).not.toHaveBeenCalled();
  });

  it('accepts exactly 366 days between the two dates', async () => {
    await get('from=2025-03-01&to=2026-03-02').expect(200);
  });

  it.each([
    ['a Servicio that does not exist', 99],
    ['a Servicio personal of another Usuario', 8],
    ['a Servicio del Negocio', 1],
  ])('is 404 for %s', async (_name, serviceId) => {
    const res = await get(
      `from=2026-03-01&to=2026-03-10&serviceId=${serviceId}`,
    ).expect(404);

    expect(res.body.message).toBe(`Service ${serviceId} not found`);
    expect(t.analytics.kpis).not.toHaveBeenCalled();
  });

  it('is 400 with a serviceId that is not a number', async () => {
    await get('from=2026-03-01&to=2026-03-10&serviceId=abc').expect(400);
  });

  it('is 422 when the Usuario has no default Availability', async () => {
    t.availabilities.listByUser.mockResolvedValue([]);

    await get('from=2026-03-01&to=2026-03-10').expect(422);
  });
});

describe('GET /analytics/personal/bookings.csv', () => {
  let t: TestApp;

  const ROW: BookingRow = {
    startsAt: '2026-03-02 10:00',
    serviceName: 'Corte',
    branchName: null,
    employeeName: null,
    clientName: 'Cami',
    clientEmail: 'cami@example.com',
    status: 'BOOKED',
    rescheduled: false,
    attended: false,
    noShow: false,
    employeeNoShow: false,
    price: 1500,
    rating: null,
  };
  const STATES: Partial<BookingRow>[] = [
    { status: 'PENDING' },
    { status: 'BOOKED', attended: true, rating: 5 },
    { status: 'REJECTED' },
    { status: 'CANCELLED' },
    { status: 'CANCELLED', rescheduled: true },
    { noShow: true },
    { employeeNoShow: true },
  ];

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    t.availabilities.listByUser.mockResolvedValue([DEFAULT_AVAILABILITY]);
    t.services.findById.mockImplementation(
      async (id) =>
        [PERSONAL, BRUNOS, ANAS_SERVICE].find((s) => s.id === id) ?? null,
    );
    t.analytics.bookingRows.mockResolvedValue(
      STATES.map((state) => ({ ...ROW, ...state })),
    );
  });
  afterEach(() => t.app.close());

  const get = (query: string) =>
    t.http
      .get(`/analytics/personal/bookings.csv?${query}`)
      .set(bearer(CLERK_TOKEN));
  const MARCH = 'from=2026-03-01&to=2026-03-10';

  it('answers a downloadable CSV with the BOM, the header and a row per Turno', async () => {
    const res = await get(MARCH).expect(200);

    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="turnos-2026-03-01-2026-03-10.csv"',
    );
    const lines = res.text.split('\r\n');
    expect(lines[0]).toBe(
      '﻿Fecha y hora,Servicio,Sucursal,Empleado,Cliente,Email,Estado,Atendido,Ausencia del Invitado,Ausencia del Anfitrión,Precio,Calificación',
    );
    expect(lines.slice(1, 8).map((l) => l.split(',').slice(6, 10))).toEqual([
      ['Pendiente', 'No', 'No', 'No'],
      ['Aceptado', 'Sí', 'No', 'No'],
      ['Rechazado', 'No', 'No', 'No'],
      ['Cancelado', 'No', 'No', 'No'],
      ['Reagendado', 'No', 'No', 'No'],
      ['Aceptado', 'No', 'Sí', 'No'],
      ['Aceptado', 'No', 'No', 'Sí'],
    ]);
    expect(lines[1]).toBe(
      '2026-03-02 10:00,Corte,,,Cami,cami@example.com,Pendiente,No,No,No,1500,',
    );
    expect(lines[2].endsWith(',1500,5')).toBe(true);
  });

  it('escapes commas and quotes in the cells', async () => {
    t.analytics.bookingRows.mockResolvedValue([
      { ...ROW, clientName: 'Pérez, "Cami"' },
    ]);

    const res = await get(MARCH).expect(200);

    expect(res.text).toContain(',"Pérez, ""Cami""",cami@example.com,');
  });

  it('asks only for the personal Servicios of the Usuario, in the zone of their default Availability', async () => {
    await get(`${MARCH}&serviceId=7`).expect(200);

    expect(t.analytics.bookingRows).toHaveBeenCalledWith(
      {
        kind: 'personal',
        userId: ANA.id,
        timeZone: DEFAULT_AVAILABILITY.timeZone,
      },
      { from: '2026-03-01', to: '2026-03-10' },
      t.clock.now(),
      7,
    );
  });

  it('is 401 without a Sesión', async () => {
    await t.http.get(`/analytics/personal/bookings.csv?${MARCH}`).expect(401);
  });

  it('is 400 with an invalid range', async () => {
    const res = await get('from=2026-03-10&to=2026-03-01').expect(400);

    expect(res.body.message).toBe(
      'Invalid analytics range 2026-03-10..2026-03-01',
    );
  });

  it.each([
    ['one that does not exist', 99],
    ['one of another Usuario', 8],
    ['a Servicio del Negocio', 1],
  ])('is 404 for %s', async (_name, serviceId) => {
    const res = await get(`${MARCH}&serviceId=${serviceId}`).expect(404);

    expect(res.body.message).toBe(`Service ${serviceId} not found`);
  });

  it('is 422 when the Usuario has no default Availability', async () => {
    t.availabilities.listByUser.mockResolvedValue([]);

    await get(MARCH).expect(422);
  });
});
