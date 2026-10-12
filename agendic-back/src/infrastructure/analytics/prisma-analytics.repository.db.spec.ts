import 'dotenv/config';
import {
  AnalyticsScope,
  KpiValues,
} from '../../domain/analytics/analytics.repository';
import {
  BookingStatus,
  Prisma,
  ServiceCategory,
} from '../../generated/prisma/client';
import { GetPersonalAnalyticsUseCase } from '../../application/analytics/get-personal-analytics.use-case';
import { PrismaBusinessesRepository } from '../businesses/prisma-businesses.repository';
import { PrismaService } from '../prisma.service';
import { PrismaAnalyticsRepository } from './prisma-analytics.repository';

const BUENOS_AIRES = 'America/Argentina/Buenos_Aires';
const NOW = new Date('2031-12-31T12:00:00.000Z');
const MARCH = { from: '2031-03-01', to: '2031-03-31' };

/** Runs against the real database: the counting rules of the analíticas are SQL, so only Postgres can prove them. */
describe('PrismaAnalyticsRepository (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaAnalyticsRepository(prisma);
  const businesses = new PrismaBusinessesRepository(prisma);
  const tag = `analytics-${Date.now()}`;
  const created = { userIds: [] as number[], businessIds: [] as number[] };
  let counter = 0;

  const makeUser = async () => {
    const suffix = `u${++counter}`;
    const user = await prisma.user.create({
      data: {
        clerkId: `${tag}-${suffix}`,
        name: `${tag}-${suffix}`,
        email: `${tag}-${suffix}@example.com`,
        availabilities: {
          create: {
            name: 'Horas laborables',
            timeZone: BUENOS_AIRES,
            isDefault: true,
          },
        },
      },
    });
    created.userIds.push(user.id);
    return user;
  };

  const makeService = (userId: number, price = 100) =>
    prisma.service.create({
      data: {
        userId,
        name: `${tag}-${++counter}`,
        slug: `${tag}-${counter}`,
        category: ServiceCategory.SPA,
        durationMinutes: 30,
        price,
      },
    });

  /** A Usuario with one Servicio personal, and the scope the use case would resolve for it. */
  const makeScope = async () => {
    const user = await makeUser();
    const service = await makeService(user.id);
    const scope: AnalyticsScope = {
      kind: 'personal',
      userId: user.id,
      timeZone: BUENOS_AIRES,
    };
    return { user, service, scope };
  };

  type BookingOverrides = Partial<Prisma.BookingUncheckedCreateInput>;

  /** A 30 minute Turno starting at `startsAt`, BOOKED and created on the same day unless overridden. */
  const book = (
    serviceId: number,
    userId: number,
    startsAt: string,
    overrides: BookingOverrides = {},
  ) => {
    const start = new Date(startsAt);
    return prisma.booking.create({
      data: {
        serviceId,
        userId,
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

  const kpis = (
    scope: AnalyticsScope,
    range = MARCH,
    serviceId?: number,
  ): Promise<KpiValues> => repository.kpis(scope, range, NOW, serviceId);

  afterAll(async () => {
    const services = { service: { userId: { in: created.userIds } } };
    await prisma.bookingRating.deleteMany({ where: { booking: services } });
    await prisma.booking.deleteMany({ where: services });
    await prisma.service.deleteMany({
      where: { userId: { in: created.userIds } },
    });
    const branches = { branch: { businessId: { in: created.businessIds } } };
    await prisma.booking.deleteMany({ where: { service: branches } });
    await prisma.service.deleteMany({ where: branches });
    await prisma.bookingSlug.deleteMany({
      where: { businessId: { in: created.businessIds } },
    });
    await prisma.branch.deleteMany({
      where: { businessId: { in: created.businessIds } },
    });
    await prisma.employee.deleteMany({
      where: { userId: { in: created.userIds } },
    });
    await prisma.business.deleteMany({
      where: { id: { in: created.businessIds } },
    });
    await prisma.availability.deleteMany({
      where: { userId: { in: created.userIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
    await prisma.$disconnect();
  });

  it('counts booked by createdAt, leaving out the Turnos born from a Reagendar and the rescheduled originals', async () => {
    const { user, service, scope } = await makeScope();
    const original = await book(service.id, user.id, '2031-03-05T13:00:00Z', {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date('2031-03-06T13:00:00Z'),
      rescheduled: true,
      link: `${tag}-original`,
    });
    await book(service.id, user.id, '2031-03-07T13:00:00Z', {
      fromRescheduleId: original.id,
      createdAt: new Date('2031-03-06T13:00:00Z'),
    });
    await book(service.id, user.id, '2031-03-08T13:00:00Z');
    await book(service.id, user.id, '2031-04-08T13:00:00Z', {
      createdAt: new Date('2031-04-08T13:00:00Z'),
    });

    expect((await kpis(scope)).booked).toBe(1);
  });

  it('counts attended: BOOKED, already ended, without Ausencia nor Falta del Empleado, by startsAt', async () => {
    const { user, service, scope } = await makeScope();
    await book(service.id, user.id, '2031-03-05T13:00:00Z');
    await book(service.id, user.id, '2031-03-06T13:00:00Z', {
      noShowAt: new Date('2031-03-07T00:00:00Z'),
    });
    await book(service.id, user.id, '2031-03-07T13:00:00Z', {
      employeeNoShowAt: new Date('2031-03-08T00:00:00Z'),
    });
    await book(service.id, user.id, '2031-03-08T13:00:00Z', {
      status: BookingStatus.PENDING,
    });
    await book(service.id, user.id, '2031-04-05T13:00:00Z');

    expect((await kpis(scope)).attended).toBe(1);
    const endsAt = new Date('2031-03-05T13:30:00Z');
    expect((await repository.kpis(scope, MARCH, endsAt)).attended).toBe(0);
    expect(
      (await repository.kpis(scope, MARCH, new Date(endsAt.getTime() + 1000)))
        .attended,
    ).toBe(1);
  });

  it('counts rescheduled by cancelledAt, only the originals', async () => {
    const { user, service, scope } = await makeScope();
    await book(service.id, user.id, '2031-03-05T13:00:00Z', {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date('2031-03-20T13:00:00Z'),
      rescheduled: true,
      link: null,
    });
    await book(service.id, user.id, '2031-03-06T13:00:00Z', {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date('2031-04-02T13:00:00Z'),
      rescheduled: true,
    });
    await book(service.id, user.id, '2031-03-07T13:00:00Z', {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date('2031-03-20T13:00:00Z'),
    });

    expect((await kpis(scope)).rescheduled).toBe(1);
  });

  it('counts cancelled by cancelledAt, with IS NOT TRUE so the rescheduled originals stay out and the null ones count', async () => {
    const { user, service, scope } = await makeScope();
    await book(service.id, user.id, '2031-03-05T13:00:00Z', {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date('2031-03-20T13:00:00Z'),
      rescheduled: null,
    });
    await book(service.id, user.id, '2031-03-06T13:00:00Z', {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date('2031-03-21T13:00:00Z'),
      rescheduled: true,
    });
    await book(service.id, user.id, '2031-03-07T13:00:00Z', {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date('2031-04-21T13:00:00Z'),
    });

    expect((await kpis(scope)).cancelled).toBe(1);
  });

  it('counts rejected by rejectedAt', async () => {
    const { user, service, scope } = await makeScope();
    await book(service.id, user.id, '2031-03-05T13:00:00Z', {
      status: BookingStatus.REJECTED,
      rejectedAt: new Date('2031-03-20T13:00:00Z'),
    });
    await book(service.id, user.id, '2031-03-06T13:00:00Z', {
      status: BookingStatus.REJECTED,
      rejectedAt: new Date('2031-04-20T13:00:00Z'),
    });
    await book(service.id, user.id, '2031-03-07T13:00:00Z', {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date('2031-03-20T13:00:00Z'),
    });

    expect((await kpis(scope)).rejected).toBe(1);
  });

  it('counts pending by startsAt, only those still PENDING', async () => {
    const { user, service, scope } = await makeScope();
    await book(service.id, user.id, '2031-03-05T13:00:00Z', {
      status: BookingStatus.PENDING,
    });
    await book(service.id, user.id, '2031-04-05T13:00:00Z', {
      status: BookingStatus.PENDING,
    });
    await book(service.id, user.id, '2031-03-06T13:00:00Z');

    expect((await kpis(scope)).pending).toBe(1);
  });

  it('counts noShows by startsAt', async () => {
    const { user, service, scope } = await makeScope();
    await book(service.id, user.id, '2031-03-05T13:00:00Z', {
      noShowAt: new Date('2031-03-06T00:00:00Z'),
    });
    await book(service.id, user.id, '2031-04-05T13:00:00Z', {
      noShowAt: new Date('2031-04-06T00:00:00Z'),
    });
    await book(service.id, user.id, '2031-03-06T13:00:00Z');

    expect((await kpis(scope)).noShows).toBe(1);
  });

  it('counts employeeNoShows by startsAt', async () => {
    const { user, service, scope } = await makeScope();
    await book(service.id, user.id, '2031-03-05T13:00:00Z', {
      employeeNoShowAt: new Date('2031-03-06T00:00:00Z'),
    });
    await book(service.id, user.id, '2031-04-05T13:00:00Z', {
      employeeNoShowAt: new Date('2031-04-06T00:00:00Z'),
    });
    await book(service.id, user.id, '2031-03-06T13:00:00Z', {
      noShowAt: new Date('2031-03-07T00:00:00Z'),
    });

    expect((await kpis(scope)).employeeNoShows).toBe(1);
  });

  it('averages the scores and computes csat with one decimal, by the Calificación date', async () => {
    const { user, service, scope } = await makeScope();
    const rate = async (startsAt: string, score: number, createdAt: string) => {
      const booking = await book(service.id, user.id, startsAt);
      await prisma.bookingRating.create({
        data: { bookingId: booking.id, score, createdAt: new Date(createdAt) },
      });
    };
    await rate('2031-03-05T13:00:00Z', 5, '2031-03-06T13:00:00Z');
    await rate('2031-03-06T13:00:00Z', 4, '2031-03-07T13:00:00Z');
    await rate('2031-03-07T13:00:00Z', 1, '2031-03-08T13:00:00Z');
    await rate('2031-03-08T13:00:00Z', 1, '2031-04-08T13:00:00Z');

    const { averageRating, csat } = await kpis(scope);
    expect(averageRating).toBeCloseTo(10 / 3, 10);
    expect(csat).toBe(66.7);
  });

  it('answers null for averageRating and csat without Calificaciones', async () => {
    const { user, service, scope } = await makeScope();
    await book(service.id, user.id, '2031-03-05T13:00:00Z');

    const { averageRating, csat } = await kpis(scope);
    expect(averageRating).toBeNull();
    expect(csat).toBeNull();
  });

  it('sums the price of the attended Turnos as a number, 0 when there are none', async () => {
    const { user, service, scope } = await makeScope();
    expect((await kpis(scope)).revenue).toBe(0);
    await book(service.id, user.id, '2031-03-05T13:00:00Z', {
      price: new Prisma.Decimal('120.50'),
    });
    await book(service.id, user.id, '2031-03-06T13:00:00Z', {
      price: new Prisma.Decimal('80.25'),
    });
    await book(service.id, user.id, '2031-03-07T13:00:00Z', {
      price: new Prisma.Decimal('999'),
      noShowAt: new Date('2031-03-08T00:00:00Z'),
    });

    expect((await kpis(scope)).revenue).toBe(200.75);
  });

  it('cuts the day in the time zone of the scope: 23:30 in Buenos Aires is still that day, though it is the next one in UTC', async () => {
    const { user, service, scope } = await makeScope();
    await book(service.id, user.id, '2031-03-10T02:30:00Z');

    expect(
      (await kpis(scope, { from: '2031-03-09', to: '2031-03-09' })).booked,
    ).toBe(1);
    expect(
      (await kpis(scope, { from: '2031-03-10', to: '2031-03-10' })).booked,
    ).toBe(0);
    expect(
      (
        await kpis(
          { ...scope, timeZone: 'UTC' },
          { from: '2031-03-10', to: '2031-03-10' },
        )
      ).booked,
    ).toBe(1);
  });

  it('includes both ends of the range and nothing outside it', async () => {
    const { user, service, scope } = await makeScope();
    await book(service.id, user.id, '2031-02-28T13:00:00Z');
    await book(service.id, user.id, '2031-03-01T13:00:00Z');
    await book(service.id, user.id, '2031-03-31T13:00:00Z');
    await book(service.id, user.id, '2031-04-01T13:00:00Z');

    expect((await kpis(scope)).booked).toBe(2);
  });

  it('looks only at the Servicios personales of the Usuario, or at the one asked for', async () => {
    const { user, service, scope } = await makeScope();
    const second = await makeService(user.id);
    const other = await makeUser();
    const othersService = await makeService(other.id);
    const business = (
      await businesses.create({
        business: {
          name: tag,
          description: tag,
          ownerId: user.id,
          slug: `${tag}-biz`,
        },
        branch: {
          name: tag,
          address: 'Calle 1',
          timeZone: BUENOS_AIRES,
          slug: 'sucursal',
        },
        employee: { userId: user.id },
      })
    ).business;
    created.businessIds.push(business.id);
    const branch = await prisma.branch.findFirstOrThrow({
      where: { businessId: business.id },
    });
    const businessService = await prisma.service.create({
      data: {
        branchId: branch.id,
        name: tag,
        slug: `${tag}-negocio`,
        category: ServiceCategory.SPA,
        durationMinutes: 30,
        price: 100,
      },
    });
    await book(service.id, user.id, '2031-03-05T13:00:00Z');
    await book(second.id, user.id, '2031-03-06T13:00:00Z');
    await book(othersService.id, other.id, '2031-03-07T13:00:00Z');
    await book(businessService.id, user.id, '2031-03-08T13:00:00Z');

    expect((await kpis(scope)).booked).toBe(2);
    expect((await kpis(scope, MARCH, second.id)).booked).toBe(1);
  });

  it('counts the Servicios personales dados de baja', async () => {
    const { user, service, scope } = await makeScope();
    await book(service.id, user.id, '2031-03-05T13:00:00Z');
    await prisma.service.update({
      where: { id: service.id },
      data: { deletedAt: new Date() },
    });

    expect((await kpis(scope)).booked).toBe(1);
  });

  it('answers the previous period with the same length ending the day before from, through the use case', async () => {
    const { user, service } = await makeScope();
    const useCase = new GetPersonalAnalyticsUseCase(
      repository,
      {} as never,
      {
        listByUser: async () => [{ isDefault: true, timeZone: BUENOS_AIRES }],
      } as never,
      { now: () => NOW },
    );
    await book(service.id, user.id, '2031-03-05T13:00:00Z');
    await book(service.id, user.id, '2031-03-06T13:00:00Z');
    await book(service.id, user.id, '2031-02-25T13:00:00Z');
    await book(service.id, user.id, '2031-02-18T13:00:00Z');

    const { kpis } = await useCase.execute(user.id, '2031-03-01', '2031-03-10');

    expect(kpis.booked).toEqual({ current: 2, previous: 1 });
  });
});
