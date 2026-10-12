import {
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
