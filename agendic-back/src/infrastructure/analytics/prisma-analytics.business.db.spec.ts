import 'dotenv/config';
import { AnalyticsScope } from '../../domain/analytics/analytics.repository';
import {
  BookingStatus,
  Prisma,
  ServiceCategory,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { PrismaAnalyticsRepository } from './prisma-analytics.repository';

const BUENOS_AIRES = 'America/Argentina/Buenos_Aires';
const TOKYO = 'Asia/Tokyo';
const NOW = new Date('2031-12-31T12:00:00.000Z');
const MARCH = { from: '2031-03-01', to: '2031-03-31' };

type BusinessScope = Extract<AnalyticsScope, { kind: 'business' }>;
type Attendant = { id: number; userId: number };

/** Runs against the real database: the counting rules of the analíticas del Negocio are SQL, so only Postgres can prove them. */
describe('PrismaAnalyticsRepository, Negocio scope (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaAnalyticsRepository(prisma);
  const tag = `analytics-biz-${Date.now()}`;
  const created = { userIds: [] as number[], businessIds: [] as number[] };
  let counter = 0;

  const makeUser = async (name = `${tag}-u${++counter}`) => {
    const user = await prisma.user.create({
      data: {
        clerkId: `${tag}-${++counter}`,
        name,
        email: `${tag}-${++counter}@example.com`,
        imageUrl: `https://img/${counter}`,
      },
    });
    created.userIds.push(user.id);
    return user;
  };

  const makeBranch = (businessId: number, timeZone: string) =>
    prisma.branch.create({
      data: {
        businessId,
        name: `${tag}-b${++counter}`,
        address: 'x',
        timeZone,
        slug: `${tag}-bs${++counter}`,
      },
    });

  const makeService = (
    branchId: number,
    overrides: { name?: string; hidden?: boolean; deletedAt?: Date } = {},
  ) =>
    prisma.service.create({
      data: {
        branchId,
        name: overrides.name ?? `${tag}-svc${++counter}`,
        slug: `${tag}-ss${++counter}`,
        category: ServiceCategory.SPA,
        durationMinutes: 30,
        price: 100,
        hidden: overrides.hidden,
        deletedAt: overrides.deletedAt,
      },
    });

  const makeEmployee = (
    businessId: number,
    user: { id: number },
    deletedAt?: Date,
  ) =>
    prisma.employee.create({
      data: { businessId, userId: user.id, deletedAt },
    });

  /** A Negocio with one Sucursal in Buenos Aires, a Servicio and its Dueño as Empleado. */
  const makeBusiness = async () => {
    const owner = await makeUser(`${tag}-owner${++counter}`);
    const business = await prisma.business.create({
      data: {
        name: `${tag}-biz${++counter}`,
        description: 'd',
        ownerId: owner.id,
        slug: `${tag}-s${++counter}`,
      },
    });
    created.businessIds.push(business.id);
    const branch = await makeBranch(business.id, BUENOS_AIRES);
    const service = await makeService(branch.id);
    const ownerEmployee = await makeEmployee(business.id, owner);
    const scope: BusinessScope = { kind: 'business', businessId: business.id };
    return { owner, business, branch, service, ownerEmployee, scope };
  };

  /** A 30 minute Turno of `employee` at `startsAt`, BOOKED and created the same day unless overridden. */
  const book = (
    serviceId: number,
    employee: Attendant,
    startsAt: string,
    overrides: Partial<Prisma.BookingUncheckedCreateInput> = {},
  ) => {
    const start = new Date(startsAt);
    return prisma.booking.create({
      data: {
        serviceId,
        employeeId: employee.id,
        userId: employee.userId,
        prepStartsAt: start,
        startsAt: start,
        endsAt: new Date(start.getTime() + 30 * 60 * 1000),
        status: BookingStatus.BOOKED,
        price: 100,
        createdAt: start,
        ...overrides,
      },
    });
  };

  const booked = async (scope: AnalyticsScope, serviceId?: number) =>
    (await repository.kpis(scope, MARCH, NOW, serviceId)).booked;

  afterAll(async () => {
    const branches = { branch: { businessId: { in: created.businessIds } } };
    await prisma.bookingRating.deleteMany({
      where: { booking: { service: branches } },
    });
    await prisma.client.deleteMany({
      where: { booking: { service: branches } },
    });
    await prisma.booking.deleteMany({ where: { service: branches } });
    await prisma.service.deleteMany({ where: branches });
    await prisma.employee.deleteMany({
      where: { businessId: { in: created.businessIds } },
    });
    await prisma.branch.deleteMany({
      where: { businessId: { in: created.businessIds } },
    });
    await prisma.business.deleteMany({
      where: { id: { in: created.businessIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
    await prisma.$disconnect();
  });

  it('counts only the Servicios del Negocio of that Negocio, not another Negocio', async () => {
    const a = await makeBusiness();
    const b = await makeBusiness();
    await book(a.service.id, a.ownerEmployee, '2031-03-05T13:00:00Z');
    await book(b.service.id, b.ownerEmployee, '2031-03-05T13:00:00Z');
    await book(b.service.id, b.ownerEmployee, '2031-03-06T13:00:00Z');

    expect(await booked(a.scope)).toBe(1);
    expect(await booked(b.scope)).toBe(2);
  });

  it('forced to an Empleado, counts only the Turnos that Empleado attends', async () => {
    const { business, service, ownerEmployee, scope } = await makeBusiness();
    const bruno = await makeEmployee(business.id, await makeUser());
    await book(service.id, ownerEmployee, '2031-03-05T13:00:00Z');
    await book(service.id, bruno, '2031-03-06T13:00:00Z');
    await book(service.id, bruno, '2031-03-07T13:00:00Z');

    expect(await booked({ ...scope, employeeId: bruno.id })).toBe(2);
    expect(await booked({ ...scope, employeeId: ownerEmployee.id })).toBe(1);
    expect(await booked(scope)).toBe(3);
  });

  it('filters by Sucursal and by Servicio', async () => {
    const { business, branch, service, ownerEmployee, scope } =
      await makeBusiness();
    const other = await makeBranch(business.id, BUENOS_AIRES);
    const otherService = await makeService(other.id);
    await book(service.id, ownerEmployee, '2031-03-05T13:00:00Z');
    await book(otherService.id, ownerEmployee, '2031-03-06T13:00:00Z');
    await book(otherService.id, ownerEmployee, '2031-03-07T13:00:00Z');

    expect(await booked({ ...scope, branchId: branch.id })).toBe(1);
    expect(await booked({ ...scope, branchId: other.id })).toBe(2);
    expect(await booked(scope, otherService.id)).toBe(2);
    expect(
      await booked({ ...scope, branchId: branch.id }, otherService.id),
    ).toBe(0);
  });

  it('cuts each Turno in the time zone of its own Sucursal', async () => {
    const { business, service, ownerEmployee, scope } = await makeBusiness();
    const tokyo = await makeBranch(business.id, TOKYO);
    const tokyoService = await makeService(tokyo.id);
    const instant = '2031-04-01T02:00:00Z';
    await book(service.id, ownerEmployee, instant);
    await book(tokyoService.id, ownerEmployee, '2031-04-01T02:30:00Z');

    expect(await booked(scope)).toBe(1);
    expect(await booked({ ...scope, branchId: tokyo.id })).toBe(0);
    const april = { from: '2031-04-01', to: '2031-04-30' };
    expect((await repository.kpis(scope, april, NOW)).booked).toBe(1);
  });

  describe('breakdown', () => {
    it('answers the popular Servicios and the Calificaciones with the name of the Empleado', async () => {
      const { service, ownerEmployee, owner, scope } = await makeBusiness();
      const booking = await book(
        service.id,
        ownerEmployee,
        '2031-03-05T13:00:00Z',
      );
      await prisma.client.create({
        data: { bookingId: booking.id, name: 'Cami', email: `${tag}@x.com` },
      });
      await prisma.bookingRating.create({
        data: {
          bookingId: booking.id,
          score: 5,
          createdAt: new Date('2031-03-06T13:00:00Z'),
        },
      });

      const { popularServices, recentRatings } = await repository.breakdown(
        scope,
        MARCH,
        NOW,
        'week',
        1,
      );

      expect(popularServices).toEqual([
        { serviceId: service.id, name: service.name, count: 1 },
      ]);
      expect(recentRatings).toHaveLength(1);
      expect(recentRatings[0].employeeName).toBe(owner.name);
    });

    it('narrows the trend to the Empleado of the scope', async () => {
      const { business, service, ownerEmployee, scope } = await makeBusiness();
      const bruno = await makeEmployee(business.id, await makeUser());
      await book(service.id, ownerEmployee, '2031-03-05T13:00:00Z');
      await book(service.id, bruno, '2031-03-05T14:00:00Z');

      const { trend } = await repository.breakdown(
        { ...scope, employeeId: bruno.id },
        { from: '2031-03-05', to: '2031-03-05' },
        NOW,
        'day',
        1,
      );

      expect(trend).toEqual([expect.objectContaining({ booked: 1 })]);
    });
  });

  describe('employeeRankings', () => {
    const rank = (scope: BusinessScope, serviceId?: number) =>
      repository.employeeRankings(scope, MARCH, serviceId);

    it('ranks the most and the least booked, the least including the Empleados with 0', async () => {
      const { business, service, owner, ownerEmployee, scope } =
        await makeBusiness();
      const bruno = await makeUser(`${tag}-bruno`);
      const brunoEmployee = await makeEmployee(business.id, bruno);
      const cami = await makeUser(`${tag}-cami`);
      const camiEmployee = await makeEmployee(business.id, cami);
      await book(service.id, ownerEmployee, '2031-03-05T13:00:00Z');
      await book(service.id, ownerEmployee, '2031-03-06T13:00:00Z');
      await book(service.id, brunoEmployee, '2031-03-07T13:00:00Z');

      const { mostBookedEmployees, leastBookedEmployees } = await rank(scope);

      expect(mostBookedEmployees).toEqual([
        {
          employeeId: ownerEmployee.id,
          name: owner.name,
          imageUrl: owner.imageUrl,
          count: 2,
        },
        {
          employeeId: brunoEmployee.id,
          name: bruno.name,
          imageUrl: bruno.imageUrl,
          count: 1,
        },
      ]);
      expect(leastBookedEmployees.map((e) => [e.employeeId, e.count])).toEqual([
        [camiEmployee.id, 0],
        [brunoEmployee.id, 1],
        [ownerEmployee.id, 2],
      ]);
    });

    it('leaves out Rechazados, rescheduled originals and Turnos outside the range, and the Empleados dados de baja', async () => {
      const { business, service, ownerEmployee, scope } = await makeBusiness();
      const retired = await makeEmployee(
        business.id,
        await makeUser(),
        new Date('2031-01-01T00:00:00Z'),
      );
      await book(service.id, ownerEmployee, '2031-03-05T13:00:00Z');
      await book(service.id, ownerEmployee, '2031-03-06T13:00:00Z', {
        status: BookingStatus.REJECTED,
        rejectedAt: new Date('2031-03-06T14:00:00Z'),
      });
      await book(service.id, ownerEmployee, '2031-03-07T13:00:00Z', {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date('2031-03-07T14:00:00Z'),
        rescheduled: true,
      });
      await book(service.id, ownerEmployee, '2031-04-07T13:00:00Z');
      await book(service.id, retired, '2031-03-08T13:00:00Z');

      const rankings = await rank(scope);

      expect(rankings.mostBookedEmployees.map((e) => e.count)).toEqual([1]);
      for (const list of Object.values(rankings))
        expect(list.map((e) => e.employeeId)).not.toContain(retired.id);
    });

    it('ranks the most cancelled by cancelledAt, without the rescheduled', async () => {
      const { business, service, ownerEmployee, scope } = await makeBusiness();
      const bruno = await makeEmployee(business.id, await makeUser());
      const cancelled = (
        employee: Attendant,
        day: string,
        rescheduled?: true,
      ) =>
        book(service.id, employee, `2031-03-${day}T13:00:00Z`, {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(`2031-03-${day}T14:00:00Z`),
          rescheduled,
        });
      await cancelled(bruno, '05');
      await cancelled(bruno, '06');
      await cancelled(ownerEmployee, '07');
      await cancelled(ownerEmployee, '08', true);

      const { mostCancelledEmployees } = await rank(scope);

      expect(
        mostCancelledEmployees.map((e) => [e.employeeId, e.count]),
      ).toEqual([
        [bruno.id, 2],
        [ownerEmployee.id, 1],
      ]);
    });

    it('keeps the top 5 and respects the Sucursal and Servicio filters', async () => {
      const { business, service, scope } = await makeBusiness();
      const other = await makeBranch(business.id, BUENOS_AIRES);
      const otherService = await makeService(other.id);
      const employees: Attendant[] = [];
      for (let i = 0; i < 6; i++)
        employees.push(await makeEmployee(business.id, await makeUser()));
      for (const e of employees)
        await book(service.id, e, '2031-03-05T13:00:00Z');
      await book(otherService.id, employees[0], '2031-03-06T13:00:00Z');

      const all = await rank(scope);
      expect(all.mostBookedEmployees).toHaveLength(5);
      expect(all.leastBookedEmployees).toHaveLength(5);
      expect(all.mostBookedEmployees[0].employeeId).toBe(employees[0].id);

      const inOther = await rank({ ...scope, branchId: other.id });
      expect(inOther.mostBookedEmployees.map((e) => e.employeeId)).toEqual([
        employees[0].id,
      ]);
      const byService = await rank(scope, service.id);
      expect(byService.mostBookedEmployees[0].count).toBe(1);
    });
  });

  it('lists the Servicios of the Negocio by name, hidden and retired included, not those of another Negocio', async () => {
    const { business, branch } = await makeBusiness();
    const other = await makeBusiness();
    const second = await makeBranch(business.id, TOKYO);
    await prisma.service.deleteMany({ where: { branchId: branch.id } });
    const b = await makeService(branch.id, { name: `${tag}-b`, hidden: true });
    const a = await makeService(second.id, {
      name: `${tag}-a`,
      deletedAt: new Date('2031-01-01T00:00:00Z'),
    });

    expect(await repository.businessServices(business.id)).toEqual([
      { id: a.id, name: a.name },
      { id: b.id, name: b.name },
    ]);
    expect(
      (await repository.businessServices(other.business.id)).map((s) => s.id),
    ).toEqual([other.service.id]);
  });
  describe('employeesPerPeriod', () => {
    const perPeriod = (
      scope: BusinessScope,
      granularity: 'day' | 'week' | 'month',
      range = MARCH,
      weekStart = 1,
      serviceId?: number,
    ) =>
      repository.employeesPerPeriod(
        scope,
        range,
        granularity,
        weekStart,
        serviceId,
      );

    it('answers every bucket of the range and a row per Empleado vigente by name, with 0s', async () => {
      const { business, service, owner, ownerEmployee, scope } =
        await makeBusiness();
      const zed = await makeUser(`${tag}-zed`);
      const zedEmployee = await makeEmployee(business.id, zed);
      const retired = await makeEmployee(
        business.id,
        await makeUser(),
        new Date('2031-01-01T00:00:00Z'),
      );
      await book(service.id, ownerEmployee, '2031-03-05T13:00:00Z');
      await book(service.id, ownerEmployee, '2031-03-05T15:00:00Z');
      await book(service.id, zedEmployee, '2031-03-31T13:00:00Z');
      await book(service.id, retired, '2031-03-05T13:00:00Z');

      const { buckets, rows } = await perPeriod(scope, 'day');

      expect(buckets).toHaveLength(31);
      expect(buckets[0]).toBe('2031-03-01');
      expect(buckets[30]).toBe('2031-03-31');
      expect(rows.map((r) => r.employeeId)).toEqual(
        [ownerEmployee, zedEmployee]
          .sort((a, b) =>
            (a === ownerEmployee ? owner.name : zed.name).localeCompare(
              b === ownerEmployee ? owner.name : zed.name,
            ),
          )
          .map((e) => e.id),
      );
      const ownerRow = rows.find((r) => r.employeeId === ownerEmployee.id)!;
      expect(ownerRow).toEqual({
        employeeId: ownerEmployee.id,
        name: owner.name,
        imageUrl: owner.imageUrl,
        counts: expect.any(Array),
      });
      expect(ownerRow.counts[4]).toBe(2);
      expect(ownerRow.counts.reduce((a, b) => a + b, 0)).toBe(2);
      const zedRow = rows.find((r) => r.employeeId === zedEmployee.id)!;
      expect(zedRow.counts[30]).toBe(1);
    });

    it('is a row of 0s for an Empleado with no Turnos, and no rows without Empleados', async () => {
      const { business, scope } = await makeBusiness();
      const idle = await makeEmployee(business.id, await makeUser());

      const { rows } = await perPeriod(scope, 'month');

      expect(rows.find((r) => r.employeeId === idle.id)?.counts).toEqual([0]);
    });

    it('groups by week starting on weekStart, the first bucket being the week of from', async () => {
      const { service, ownerEmployee, scope } = await makeBusiness();
      // 2031-03-01 is a Saturday: Monday weeks start 2031-02-24, Sunday weeks 2031-02-23.
      await book(service.id, ownerEmployee, '2031-03-01T13:00:00Z');
      await book(service.id, ownerEmployee, '2031-03-03T13:00:00Z');

      const monday = await perPeriod(scope, 'week', MARCH, 1);
      const sunday = await perPeriod(scope, 'week', MARCH, 0);

      expect(monday.buckets.slice(0, 3)).toEqual([
        '2031-02-24',
        '2031-03-03',
        '2031-03-10',
      ]);
      expect(
        monday.rows
          .find((r) => r.employeeId === ownerEmployee.id)
          ?.counts.slice(0, 2),
      ).toEqual([1, 1]);
      expect(sunday.buckets.slice(0, 2)).toEqual(['2031-02-23', '2031-03-02']);
      expect(
        sunday.rows
          .find((r) => r.employeeId === ownerEmployee.id)
          ?.counts.slice(0, 2),
      ).toEqual([1, 1]);
    });

    it('groups by month', async () => {
      const { service, ownerEmployee, scope } = await makeBusiness();
      await book(service.id, ownerEmployee, '2031-03-20T13:00:00Z');
      await book(service.id, ownerEmployee, '2031-04-02T13:00:00Z');
      await book(service.id, ownerEmployee, '2031-04-03T13:00:00Z');

      const { buckets, rows } = await perPeriod(scope, 'month', {
        from: '2031-03-15',
        to: '2031-05-10',
      });

      expect(buckets).toEqual(['2031-03-01', '2031-04-01', '2031-05-01']);
      expect(
        rows.find((r) => r.employeeId === ownerEmployee.id)?.counts,
      ).toEqual([1, 2, 0]);
    });

    it('cuts the day in the time zone of the Sucursal', async () => {
      const { business, ownerEmployee } = await makeBusiness();
      const tokyo = await makeBranch(business.id, TOKYO);
      const tokyoService = await makeService(tokyo.id);
      // 20:00Z on the 5th is already the 6th in Tokyo.
      await book(tokyoService.id, ownerEmployee, '2031-03-05T20:00:00Z');

      const { rows } = await perPeriod(
        { kind: 'business', businessId: business.id },
        'day',
        { from: '2031-03-05', to: '2031-03-06' },
      );

      expect(
        rows.find((r) => r.employeeId === ownerEmployee.id)?.counts,
      ).toEqual([0, 1]);
    });

    it('leaves out Rechazados, rescheduled originals and Turnos outside the range', async () => {
      const { service, ownerEmployee, scope } = await makeBusiness();
      await book(service.id, ownerEmployee, '2031-03-05T13:00:00Z');
      await book(service.id, ownerEmployee, '2031-03-06T13:00:00Z', {
        status: BookingStatus.REJECTED,
        rejectedAt: new Date('2031-03-06T14:00:00Z'),
      });
      await book(service.id, ownerEmployee, '2031-03-07T13:00:00Z', {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date('2031-03-07T14:00:00Z'),
        rescheduled: true,
      });
      await book(service.id, ownerEmployee, '2031-04-07T13:00:00Z');

      const { rows } = await perPeriod(scope, 'month');

      expect(
        rows.find((r) => r.employeeId === ownerEmployee.id)?.counts,
      ).toEqual([1]);
    });

    it('narrows by Sucursal and by Servicio but not by Empleado', async () => {
      const { business, branch, service, ownerEmployee, scope } =
        await makeBusiness();
      const other = await makeBranch(business.id, BUENOS_AIRES);
      const otherService = await makeService(other.id);
      const bruno = await makeEmployee(business.id, await makeUser());
      await book(service.id, ownerEmployee, '2031-03-05T13:00:00Z');
      await book(otherService.id, ownerEmployee, '2031-03-06T13:00:00Z');
      await book(service.id, bruno, '2031-03-07T13:00:00Z');
      const total = (r: Awaited<ReturnType<typeof perPeriod>>, id: number) =>
        r.rows
          .find((x) => x.employeeId === id)!
          .counts.reduce((a, b) => a + b, 0);

      const byBranch = await perPeriod(
        { ...scope, branchId: branch.id, employeeId: bruno.id },
        'month',
      );
      const byService = await perPeriod(
        scope,
        'month',
        MARCH,
        1,
        otherService.id,
      );

      expect(byBranch.rows).toHaveLength(2);
      expect(total(byBranch, ownerEmployee.id)).toBe(1);
      expect(total(byBranch, bruno.id)).toBe(1);
      expect(total(byService, ownerEmployee.id)).toBe(1);
      expect(total(byService, bruno.id)).toBe(0);
    });
  });
});
