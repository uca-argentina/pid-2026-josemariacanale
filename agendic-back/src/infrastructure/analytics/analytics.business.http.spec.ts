import {
  AnalyticsBreakdown,
  EmployeeRankings,
  KPI_NAMES,
  KpiValues,
} from '../../domain/analytics/analytics.repository';
import { Business } from '../../domain/businesses/business';
import { Employee } from '../../domain/employees/employee';
import {
  ANA,
  ANAS_BRANCH,
  ANAS_BUSINESS,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  bearer,
  BRUNO,
  CLERK_TOKEN,
  createTestApp,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  TestApp,
} from '../../test-app';

const BRUNOS_EMPLOYEE: Employee = {
  ...ANAS_EMPLOYEE,
  id: 2,
  userId: BRUNO.id,
  name: BRUNO.name,
  email: BRUNO.email,
};

const OTHER_BUSINESS: Business = {
  ...ANAS_BUSINESS,
  id: 2,
  name: 'Another Salon',
  ownerId: 99,
  slug: 'another-salon',
};

/** Bruno is an Empleado of the two Negocios, with another Empleado row in each. */
const BRUNOS_EMPLOYEE_AT_OTHER: Employee = {
  ...BRUNOS_EMPLOYEE,
  id: 3,
  businessId: OTHER_BUSINESS.id,
};

const OTHER_BRANCH = { ...ANAS_BRANCH, id: 2, businessId: OTHER_BUSINESS.id };
const OTHER_SERVICE = { ...ANAS_SERVICE, id: 2, branchId: OTHER_BRANCH.id };

const kpisOf = (value: number | null): KpiValues =>
  Object.fromEntries(KPI_NAMES.map((name) => [name, value])) as KpiValues;

const BREAKDOWN: AnalyticsBreakdown = {
  trend: [],
  popularServices: [],
  recentRatings: [
    {
      score: 5,
      comment: null,
      createdAt: '2026-03-02T10:00:00.000Z',
      clientName: 'Cami',
      serviceName: 'Haircut',
      employeeName: 'Ana Pérez',
    },
  ],
};

const RANKINGS: EmployeeRankings = {
  mostBookedEmployees: [
    { employeeId: 1, name: 'Ana Pérez', imageUrl: null, count: 4 },
  ],
  leastBookedEmployees: [
    { employeeId: 2, name: 'Bruno Díaz', imageUrl: null, count: 0 },
  ],
  mostCancelledEmployees: [],
};

describe('GET /analytics/businesses', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    t.businesses.findById.mockImplementation(
      async (id) =>
        [ANAS_BUSINESS, OTHER_BUSINESS].find((b) => b.id === id) ?? null,
    );
  });
  afterEach(() => t.app.close());

  const get = () =>
    t.http.get('/analytics/businesses').set(bearer(CLERK_TOKEN));

  it('lists the Negocios where the Usuario is Empleado, their own first and the rest by name', async () => {
    const zeta = { ...OTHER_BUSINESS, id: 3, name: 'Zeta' };
    const alpha = { ...OTHER_BUSINESS, id: 4, name: 'Alpha' };
    t.businesses.findById.mockImplementation(
      async (id) =>
        [ANAS_BUSINESS, OTHER_BUSINESS, zeta, alpha].find((b) => b.id === id) ??
        null,
    );
    t.employees.listActiveByUser.mockResolvedValue(
      [OTHER_BUSINESS, zeta, ANAS_BUSINESS, alpha].map((b) => ({
        ...ANAS_EMPLOYEE,
        businessId: b.id,
      })),
    );

    const res = await get().expect(200);

    expect(res.body).toEqual([
      { id: ANAS_BUSINESS.id, name: ANAS_BUSINESS.name, isOwner: true },
      { id: 4, name: 'Alpha', isOwner: false },
      { id: 2, name: 'Another Salon', isOwner: false },
      { id: 3, name: 'Zeta', isOwner: false },
    ]);
  });

  it('leaves out the Negocios dados de baja', async () => {
    t.businesses.findById.mockResolvedValue({
      ...ANAS_BUSINESS,
      deletedAt: new Date('2026-01-01T00:00:00Z'),
    });
    t.employees.listActiveByUser.mockResolvedValue([ANAS_EMPLOYEE]);

    const res = await get().expect(200);

    expect(res.body).toEqual([]);
  });

  it('is an empty list when the Usuario is Empleado of none', async () => {
    t.employees.listActiveByUser.mockResolvedValue([]);

    const res = await get().expect(200);

    expect(res.body).toEqual([]);
  });

  it('is 401 without a Sesión', async () => {
    await t.http.get('/analytics/businesses').expect(401);
  });
});

describe('GET /analytics/businesses/:businessId', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
    scriptOtherSession(t);
    t.businesses.findById.mockImplementation(
      async (id) =>
        [ANAS_BUSINESS, OTHER_BUSINESS].find((b) => b.id === id) ?? null,
    );
    t.employees.listActiveByUser.mockImplementation(async (userId) =>
      userId === ANA.id
        ? [ANAS_EMPLOYEE]
        : userId === BRUNO.id
          ? [
              { ...BRUNOS_EMPLOYEE, businessId: ANAS_BUSINESS.id },
              BRUNOS_EMPLOYEE_AT_OTHER,
            ]
          : [],
    );
    t.employees.findById.mockImplementation(
      async (id) =>
        [ANAS_EMPLOYEE, BRUNOS_EMPLOYEE, BRUNOS_EMPLOYEE_AT_OTHER].find(
          (e) => e.id === id,
        ) ?? null,
    );
    t.employees.listActiveByBusiness.mockResolvedValue([
      ANAS_EMPLOYEE,
      BRUNOS_EMPLOYEE,
    ]);
    t.branches.listByBusiness.mockImplementation(async (id) =>
      [ANAS_BRANCH, OTHER_BRANCH].filter((b) => b.businessId === id),
    );
    t.services.findById.mockImplementation(
      async (id) =>
        [ANAS_SERVICE, OTHER_SERVICE].find((s) => s.id === id) ?? null,
    );
    t.analytics.kpis.mockImplementation(async (_scope, range) =>
      kpisOf(range.from === '2026-03-01' ? 5 : 3),
    );
    t.analytics.breakdown.mockResolvedValue(BREAKDOWN);
    t.analytics.employeeRankings.mockResolvedValue(RANKINGS);
    t.analytics.businessServices.mockResolvedValue([
      { id: 1, name: 'Haircut' },
    ]);
  });
  afterEach(() => t.app.close());

  const OWNER = CLERK_TOKEN;
  const EMPLOYEE = OTHER_CLERK_TOKEN;
  const get = (query: string, token = OWNER, businessId = ANAS_BUSINESS.id) =>
    t.http
      .get(`/analytics/businesses/${businessId}?${query}`)
      .set(bearer(token));
  const MARCH = 'from=2026-03-01&to=2026-03-10';

  describe('as the Dueño', () => {
    it('answers the KPIs, the breakdown, the rankings and the filter options with every Empleado', async () => {
      const res = await get(MARCH).expect(200);

      expect(res.body).toEqual({
        kpis: expect.any(Object),
        granularity: 'day',
        ...BREAKDOWN,
        ...RANKINGS,
        filterOptions: {
          branches: [{ id: ANAS_BRANCH.id, name: ANAS_BRANCH.name }],
          services: [{ id: 1, name: 'Haircut' }],
          employees: [
            { id: ANAS_EMPLOYEE.id, name: ANAS_EMPLOYEE.name },
            { id: BRUNOS_EMPLOYEE.id, name: BRUNOS_EMPLOYEE.name },
          ],
        },
      });
      expect(res.body.kpis.booked).toEqual({ current: 5, previous: 3 });
    });

    it('looks at the whole Negocio, with no Empleado forced', async () => {
      await get(MARCH).expect(200);

      expect(t.analytics.kpis).toHaveBeenCalledWith(
        { kind: 'business', businessId: ANAS_BUSINESS.id },
        { from: '2026-03-01', to: '2026-03-10' },
        t.clock.now(),
        undefined,
      );
    });

    it('narrows by Sucursal, Servicio and Empleado', async () => {
      await get(`${MARCH}&branchId=1&serviceId=1&employeeId=2`).expect(200);

      const scope = {
        kind: 'business',
        businessId: 1,
        branchId: 1,
        employeeId: 2,
      };
      expect(t.analytics.kpis).toHaveBeenCalledWith(
        scope,
        expect.anything(),
        t.clock.now(),
        1,
      );
      expect(t.analytics.employeeRankings).toHaveBeenCalledWith(
        scope,
        { from: '2026-03-01', to: '2026-03-10' },
        1,
      );
    });

    it('accepts an Empleado dado de baja as a filter', async () => {
      t.employees.findById.mockResolvedValue({
        ...BRUNOS_EMPLOYEE,
        businessId: ANAS_BUSINESS.id,
        deletedAt: new Date('2026-01-01T00:00:00Z'),
      });

      await get(`${MARCH}&employeeId=2`).expect(200);
    });
  });

  describe('as an Empleado who is not the Dueño', () => {
    it('sees only the Turnos he attends, with no rankings and no Empleado filter', async () => {
      const res = await get(MARCH, EMPLOYEE).expect(200);

      expect(t.analytics.kpis).toHaveBeenCalledWith(
        { kind: 'business', businessId: 1, employeeId: BRUNOS_EMPLOYEE.id },
        expect.anything(),
        t.clock.now(),
        undefined,
      );
      expect(res.body).not.toHaveProperty('mostBookedEmployees');
      expect(res.body).not.toHaveProperty('leastBookedEmployees');
      expect(res.body).not.toHaveProperty('mostCancelledEmployees');
      expect(res.body.filterOptions).toEqual({
        branches: [{ id: 1, name: ANAS_BRANCH.name }],
        services: [{ id: 1, name: 'Haircut' }],
      });
      expect(t.analytics.employeeRankings).not.toHaveBeenCalled();
      expect(t.employees.listActiveByBusiness).not.toHaveBeenCalled();
    });

    it('being Empleado of two Negocios, sees only the Turnos of the one asked for', async () => {
      await get(MARCH, EMPLOYEE, OTHER_BUSINESS.id).expect(200);

      expect(t.analytics.kpis).toHaveBeenCalledWith(
        {
          kind: 'business',
          businessId: OTHER_BUSINESS.id,
          employeeId: BRUNOS_EMPLOYEE_AT_OTHER.id,
        },
        expect.anything(),
        t.clock.now(),
        undefined,
      );
      expect(t.analytics.businessServices).toHaveBeenCalledWith(
        OTHER_BUSINESS.id,
      );
    });

    it('still narrows by Sucursal and Servicio', async () => {
      await get(`${MARCH}&branchId=1&serviceId=1`, EMPLOYEE).expect(200);

      expect(t.analytics.kpis).toHaveBeenCalledWith(
        {
          kind: 'business',
          businessId: 1,
          branchId: 1,
          employeeId: BRUNOS_EMPLOYEE.id,
        },
        expect.anything(),
        t.clock.now(),
        1,
      );
    });
  });

  describe('errors', () => {
    it('is 401 without a Sesión', async () => {
      await t.http.get(`/analytics/businesses/1?${MARCH}`).expect(401);
    });

    it.each([
      ['a malformed date', 'from=2026-3-1&to=2026-03-10'],
      ['from after to', 'from=2026-03-10&to=2026-03-01'],
      ['more than 366 days', 'from=2025-01-01&to=2026-03-01'],
      ['a missing date', 'from=2026-03-01'],
    ])('is 400 with %s', async (_name, query) => {
      const [from, to] = [
        /from=([^&]*)/.exec(query)?.[1],
        /to=([^&]*)/.exec(query)?.[1],
      ];

      const res = await get(query).expect(400);

      expect(res.body.message).toBe(`Invalid analytics range ${from}..${to}`);
      expect(t.analytics.kpis).not.toHaveBeenCalled();
    });

    it('is 404 when the Negocio does not exist', async () => {
      const res = await get(MARCH, OWNER, 99).expect(404);

      expect(res.body.message).toBe('Business 99 not found');
    });

    it('is 404 when the Negocio was dado de baja', async () => {
      t.businesses.findById.mockResolvedValue({
        ...ANAS_BUSINESS,
        deletedAt: new Date('2026-01-01T00:00:00Z'),
      });

      const res = await get(MARCH).expect(404);

      expect(res.body.message).toBe('Business 1 not found');
    });

    it('is 403 when the Usuario is not an Empleado of the Negocio', async () => {
      t.employees.listActiveByUser.mockResolvedValue([]);

      const res = await get(MARCH).expect(403);

      expect(res.body.message).toBe(
        'Only Employees of Business 1 can see its analytics',
      );
      expect(t.analytics.kpis).not.toHaveBeenCalled();
    });

    it('is 403 when an Empleado who is not the Dueño filters by Empleado', async () => {
      const res = await get(`${MARCH}&employeeId=1`, EMPLOYEE).expect(403);

      expect(res.body.message).toBe('Only the owner can filter by Employee');
    });

    it.each([
      ['branchId', 'Branch', 2],
      ['serviceId', 'Service', 2],
      ['employeeId', 'Employee', 3],
      ['branchId', 'Branch', 99],
      ['serviceId', 'Service', 99],
      ['employeeId', 'Employee', 99],
    ])(
      'is 404 when %s=%s does not belong to the Negocio',
      async (param, label, id) => {
        const res = await get(`${MARCH}&${param}=${id}`).expect(404);

        expect(res.body.message).toBe(`${label} ${id} not found`);
        expect(t.analytics.kpis).not.toHaveBeenCalled();
      },
    );

    it('is 400 with a filter that is not a number', async () => {
      await get(`${MARCH}&branchId=abc`).expect(400);
    });
  });
});
