import 'dotenv/config';
import {
  BookingStatus,
  Prisma,
  ServiceCategory,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { PrismaBadgesRepository } from './prisma-badges.repository';

const NOW = new Date('2031-12-31T12:00:00.000Z');
const ZERO = { attended: 0, fiveStars: 0, loyalClients: 0, streak: 0 };

/** Runs against the real database: what counts for an Insignia is SQL, so only Postgres can prove it. */
describe('PrismaBadgesRepository (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaBadgesRepository(prisma);
  const tag = `badges-${Date.now()}`;
  const created = { userIds: [] as number[], businessIds: [] as number[] };
  let counter = 0;
  let day = 0;

  const makeUser = async () => {
    const suffix = `u${++counter}`;
    const user = await prisma.user.create({
      data: {
        clerkId: `${tag}-${suffix}`,
        name: `${tag}-${suffix}`,
        email: `${tag}-${suffix}@example.com`,
      },
    });
    created.userIds.push(user.id);
    return user;
  };

  const makePersonalService = (userId: number) =>
    prisma.service.create({
      data: {
        userId,
        name: `${tag}-${++counter}`,
        slug: `${tag}-${++counter}`,
        category: ServiceCategory.SPA,
        durationMinutes: 30,
        price: 100,
      },
    });

  /** A Servicio del Negocio and an Empleado of `user` in it, optionally already dado de baja. */
  const makeBusinessWork = async (user: { id: number }, deletedAt?: Date) => {
    const owner = await makeUser();
    const business = await prisma.business.create({
      data: {
        name: `${tag}-biz${++counter}`,
        description: 'd',
        ownerId: owner.id,
        slug: `${tag}-s${++counter}`,
      },
    });
    created.businessIds.push(business.id);
    const branch = await prisma.branch.create({
      data: {
        businessId: business.id,
        name: `${tag}-b${++counter}`,
        address: 'x',
        timeZone: 'America/Argentina/Buenos_Aires',
        slug: `${tag}-bs${++counter}`,
      },
    });
    const service = await prisma.service.create({
      data: {
        branchId: branch.id,
        name: `${tag}-svc${++counter}`,
        slug: `${tag}-ss${++counter}`,
        category: ServiceCategory.SPA,
        durationMinutes: 30,
        price: 100,
      },
    });
    const employee = await prisma.employee.create({
      data: { businessId: business.id, userId: user.id, deletedAt },
    });
    return { service, employee };
  };

  type BookingOverrides = Partial<Prisma.BookingUncheckedCreateInput>;

  /** A 30 minute Turno of `userId` on its own day (one a day, so none overlaps), BOOKED and already ended unless overridden. */
  const book = async (
    serviceId: number,
    userId: number,
    overrides: BookingOverrides & { email?: string } = {},
  ) => {
    const { email, ...rest } = overrides;
    const start = new Date(Date.UTC(2031, 0, 1 + ++day, 13));
    const booking = await prisma.booking.create({
      data: {
        serviceId,
        userId,
        prepStartsAt: start,
        startsAt: start,
        endsAt: new Date(start.getTime() + 30 * 60 * 1000),
        status: BookingStatus.BOOKED,
        price: 100,
        ...rest,
      },
    });
    if (email !== undefined) {
      await prisma.client.create({
        data: { bookingId: booking.id, name: 'Cami', email },
      });
    }
    return booking;
  };

  const measureOne = async (userId: number) =>
    (await repository.measure([userId], NOW)).get(userId)!;

  afterAll(async () => {
    const ofUsers = { userId: { in: created.userIds } };
    await prisma.userBadge.deleteMany({ where: ofUsers });
    await prisma.bookingRating.deleteMany({ where: { booking: ofUsers } });
    await prisma.booking.deleteMany({ where: ofUsers });
    await prisma.service.deleteMany({ where: ofUsers });
    const branches = { branch: { businessId: { in: created.businessIds } } };
    await prisma.service.deleteMany({ where: branches });
    await prisma.employee.deleteMany({ where: ofUsers });
    await prisma.branch.deleteMany({
      where: { businessId: { in: created.businessIds } },
    });
    await prisma.business.deleteMany({
      where: { id: { in: created.businessIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
    await prisma.$disconnect();
  });

  describe('measure', () => {
    it('adds the Turnos of Servicios personales and of every Negocio, also the one the Usuario was dado de baja from', async () => {
      const user = await makeUser();
      const personal = await makePersonalService(user.id);
      const current = await makeBusinessWork(user);
      const left = await makeBusinessWork(user, new Date('2031-06-01'));
      await book(personal.id, user.id);
      await book(current.service.id, user.id, {
        employeeId: current.employee.id,
      });
      await book(left.service.id, user.id, { employeeId: left.employee.id });

      expect((await measureOne(user.id)).attended).toBe(3);
    });

    it('counts as attended only an accepted Turno that already ended, without either Ausencia nor Reagendar', async () => {
      const user = await makeUser();
      const service = await makePersonalService(user.id);
      await book(service.id, user.id);
      await book(service.id, user.id, { noShowAt: new Date('2031-02-01') });
      await book(service.id, user.id, {
        employeeNoShowAt: new Date('2031-02-01'),
      });
      await book(service.id, user.id, { status: BookingStatus.PENDING });
      await book(service.id, user.id, {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date('2031-02-01'),
        rescheduled: true,
      });
      const future = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
      await book(service.id, user.id, {
        prepStartsAt: future,
        startsAt: future,
        endsAt: new Date(future.getTime() + 30 * 60 * 1000),
      });

      expect((await measureOne(user.id)).attended).toBe(1);
    });

    it('measures every Usuario in one call, with a Usuario without work at 0', async () => {
      const [ana, bruno, idle] = [
        await makeUser(),
        await makeUser(),
        await makeUser(),
      ];
      const anas = await makePersonalService(ana.id);
      const brunos = await makePersonalService(bruno.id);
      await book(anas.id, ana.id);
      await book(brunos.id, bruno.id);
      await book(brunos.id, bruno.id);

      const metrics = await repository.measure(
        [ana.id, bruno.id, idle.id],
        NOW,
      );

      expect(metrics.get(ana.id)?.attended).toBe(1);
      expect(metrics.get(bruno.id)?.attended).toBe(2);
      expect(metrics.get(idle.id)).toEqual(ZERO);
    });

    it('runs the same number of queries for one Usuario and for many', async () => {
      const users = [await makeUser(), await makeUser(), await makeUser()];
      const spy = jest.spyOn(prisma, '$queryRaw');

      await repository.measure([users[0].id], NOW);
      const forOne = spy.mock.calls.length;
      spy.mockClear();
      await repository.measure(
        users.map((u) => u.id),
        NOW,
      );

      expect(forOne).toBe(4);
      expect(spy.mock.calls.length).toBe(forOne);
      spy.mockRestore();
    });

    it('counts the Calificaciones of 5, not the others', async () => {
      const user = await makeUser();
      const service = await makePersonalService(user.id);
      for (const score of [5, 5, 4, 1]) {
        const booking = await book(service.id, user.id);
        await prisma.bookingRating.create({
          data: { bookingId: booking.id, score },
        });
      }

      expect((await measureOne(user.id)).fiveStars).toBe(2);
    });

    describe('Clientes fieles', () => {
      it('counts an email once however many Turnos it has, from the third on', async () => {
        const user = await makeUser();
        const service = await makePersonalService(user.id);
        for (let i = 0; i < 5; i++) {
          await book(service.id, user.id, { email: 'fiel@example.com' });
        }
        for (let i = 0; i < 2; i++) {
          await book(service.id, user.id, { email: 'casi@example.com' });
        }

        expect((await measureOne(user.id)).loyalClients).toBe(1);
      });

      it('treats the same email in another casing as the same Cliente', async () => {
        const user = await makeUser();
        const service = await makePersonalService(user.id);
        await book(service.id, user.id, { email: 'Fiel@example.com' });
        await book(service.id, user.id, { email: 'fiel@Example.com' });
        await book(service.id, user.id, { email: 'fiel@example.com' });

        expect((await measureOne(user.id)).loyalClients).toBe(1);
      });

      it('does not add the Turnos a Cliente had with another Usuario', async () => {
        const [ana, bruno] = [await makeUser(), await makeUser()];
        const anas = await makePersonalService(ana.id);
        const brunos = await makePersonalService(bruno.id);
        await book(anas.id, ana.id, { email: 'c@example.com' });
        await book(anas.id, ana.id, { email: 'c@example.com' });
        await book(brunos.id, bruno.id, { email: 'c@example.com' });

        const metrics = await repository.measure([ana.id, bruno.id], NOW);

        expect(metrics.get(ana.id)?.loyalClients).toBe(0);
        expect(metrics.get(bruno.id)?.loyalClients).toBe(0);
      });
    });

    describe('Siempre presente', () => {
      it('counts every attended Turno when the Usuario never missed one', async () => {
        const user = await makeUser();
        const service = await makePersonalService(user.id);
        await book(service.id, user.id);
        await book(service.id, user.id);

        expect((await measureOne(user.id)).streak).toBe(2);
      });

      it('restarts after the last Ausencia del Anfitrión', async () => {
        const user = await makeUser();
        const service = await makePersonalService(user.id);
        await book(service.id, user.id);
        await book(service.id, user.id);
        await book(service.id, user.id, {
          employeeNoShowAt: new Date('2031-02-01'),
        });
        await book(service.id, user.id);
        await book(service.id, user.id);
        await book(service.id, user.id);

        const metrics = await measureOne(user.id);

        expect(metrics.streak).toBe(3);
        expect(metrics.attended).toBe(5);
      });

      it('is 0 when the Ausencia del Anfitrión was the last Turno', async () => {
        const user = await makeUser();
        const service = await makePersonalService(user.id);
        await book(service.id, user.id);
        await book(service.id, user.id, {
          employeeNoShowAt: new Date('2031-02-01'),
        });

        expect((await measureOne(user.id)).streak).toBe(0);
      });

      it('ignores the Ausencia del Anfitrión of another Usuario', async () => {
        const [ana, bruno] = [await makeUser(), await makeUser()];
        const anas = await makePersonalService(ana.id);
        const brunos = await makePersonalService(bruno.id);
        await book(anas.id, ana.id);
        await book(brunos.id, bruno.id, {
          employeeNoShowAt: new Date('2031-02-01'),
        });

        expect((await measureOne(ana.id)).streak).toBe(1);
      });
    });
  });

  describe('Niveles ganados', () => {
    const earnedAt = new Date('2031-01-01T10:00:00.000Z');

    it('saves a Nivel unseen and lists it by Usuario', async () => {
      const [ana, bruno] = [await makeUser(), await makeUser()];

      await repository.saveEarned([
        { userId: ana.id, badge: 'attended', level: 'silver', earnedAt },
      ]);

      const earned = await repository.listEarned([ana.id, bruno.id]);
      expect(earned.get(ana.id)).toEqual([
        { badge: 'attended', level: 'silver', earnedAt, seenAt: null },
      ]);
      expect(earned.has(bruno.id)).toBe(false);
    });

    it('ignores a Nivel already saved, also when two saves run at once, and keeps the first earnedAt', async () => {
      const user = await makeUser();
      const level = {
        userId: user.id,
        badge: 'attended',
        level: 'bronze',
      } as const;

      await Promise.all([
        repository.saveEarned([{ ...level, earnedAt }]),
        repository.saveEarned([{ ...level, earnedAt: new Date('2031-05-05') }]),
      ]);
      await repository.saveEarned([
        { ...level, earnedAt: new Date('2031-09-09') },
      ]);

      const rows = (await repository.listEarned([user.id])).get(user.id)!;
      expect(rows).toHaveLength(1);
    });

    it('marks as seen only the Niveles of that Usuario, once', async () => {
      const [ana, bruno] = [await makeUser(), await makeUser()];
      const level = { badge: 'attended', level: 'bronze', earnedAt } as const;
      await repository.saveEarned([
        { ...level, userId: ana.id },
        { ...level, userId: bruno.id },
      ]);
      const seenAt = new Date('2031-02-02T00:00:00.000Z');
      await repository.markSeen(ana.id, seenAt);
      await repository.markSeen(ana.id, new Date('2031-03-03T00:00:00.000Z'));

      const earned = await repository.listEarned([ana.id, bruno.id]);
      expect(earned.get(ana.id)![0].seenAt).toEqual(seenAt);
      expect(earned.get(bruno.id)![0].seenAt).toBeNull();
    });
  });
});
