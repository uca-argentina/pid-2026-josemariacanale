import 'dotenv/config';
import { BookingStatus } from '../../../domain/bookings/booking';
import { ServiceCategory } from '../../../domain/services/service';
import { NewStreakPrize } from '../../../domain/streaks/streak-prize';
import {
  StreakProgramOwner,
  StreakRewardType,
} from '../../../domain/streaks/streak-program';
import { PrismaService } from '../../prisma.service';
import { PrismaStreakProgramsRepository } from '../prisma-streak-programs.repository';
import { PrismaStreakPrizesRepository } from '../prisma-streak-prizes.repository';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000);

/** Runs against the real database: the scope of a Ficha, the casing of its email and the unique of the Premio are Postgres's job (ADR 0004). */
describe('PrismaStreakPrizesRepository (real database)', () => {
  const prisma = new PrismaService();
  const prizes = new PrismaStreakPrizesRepository(prisma);
  const programs = new PrismaStreakProgramsRepository(prisma);
  const tag = `prize-${Date.now()}`;
  let userId: number;
  let businessId: number;
  let branchServiceId: number;
  let otherBranchServiceId: number;
  let personalServiceId: number;
  let availabilityId: number;
  let programId: number;
  let rewardId: number;
  let ofBusiness: StreakProgramOwner;
  let personal: StreakProgramOwner;
  let slot = 0;

  /** Each Turno gets its own hours: the exclusion constraint forbids two at once for one Usuario. */
  const createTurno = async (
    serviceId: number,
    email: string,
    over: { startsAt?: Date; status?: BookingStatus; rescheduled?: boolean; noShowAt?: Date; employeeNoShowAt?: Date } = {},
  ) => {
    slot += 1;
    const startsAt = over.startsAt ?? hoursAgo(10_000 + slot * 2);
    const status = over.status ?? BookingStatus.BOOKED;
    return prisma.booking.create({
      data: {
        serviceId,
        userId,
        startsAt,
        prepStartsAt: startsAt,
        endsAt: new Date(startsAt.getTime() + 3_600_000),
        status,
        price: 10,
        link: over.rescheduled ? null : `${tag}-${slot}`,
        rescheduled: over.rescheduled ? true : null,
        cancelledAt: status === BookingStatus.CANCELLED ? startsAt : null,
        rejectedAt: status === BookingStatus.REJECTED ? startsAt : null,
        cancelledBy: status === BookingStatus.CANCELLED || status === BookingStatus.REJECTED ? 'EMPLOYEE' : null,
        noShowAt: over.noShowAt ?? null,
        employeeNoShowAt: over.employeeNoShowAt ?? null,
        client: { create: { name: 'Carla', email } },
      },
    });
  };

  const prize = (over: Partial<NewStreakPrize> = {}): NewStreakPrize => ({
    rewardId,
    owner: ofBusiness,
    clientEmail: `carla-${tag}@example.com`,
    streakStartedAt: hoursAgo(100),
    reachedCount: 5,
    type: StreakRewardType.PERCENT_DISCOUNT,
    value: 12.5,
    description: null,
    serviceName: null,
    grantedAt: NOW,
    expiresAt: null,
    ...over,
  });

  const service = (data: { branchId: number } | { userId: number; availabilityId: number }, suffix: string) =>
    prisma.service.create({
      data: {
        ...data,
        name: `${tag}-${suffix}`,
        category: ServiceCategory.OTRO,
        durationMinutes: 60,
        price: 10,
        slug: `${tag}-${suffix}`,
      },
    });

  beforeAll(async () => {
    userId = (
      await prisma.user.create({
        data: { clerkId: tag, name: tag, email: `${tag}@example.com` },
      })
    ).id;
    businessId = (
      await prisma.business.create({
        data: { name: tag, description: tag, ownerId: userId, slug: tag },
      })
    ).id;
    const branch = (slug: string) =>
      prisma.branch.create({
        data: { businessId, name: slug, slug, address: slug, timeZone: 'America/Argentina/Buenos_Aires' },
      });
    branchServiceId = (await service({ branchId: (await branch('a')).id }, 'a')).id;
    otherBranchServiceId = (await service({ branchId: (await branch('b')).id }, 'b')).id;
    availabilityId = (
      await prisma.availability.create({
        data: { userId, name: tag, timeZone: 'Europe/Madrid', isDefault: false },
      })
    ).id;
    personalServiceId = (await service({ userId, availabilityId }, 'p')).id;
    ofBusiness = { kind: 'business', businessId };
    personal = { kind: 'personal', userId };
    programId = (
      await prisma.streakProgram.create({ data: { businessId, active: true, burnAfterDays: 30 } })
    ).id;
    rewardId = (
      await prisma.streakReward.create({
        data: { programId, requiredCount: 5, repeatable: false, type: StreakRewardType.PERCENT_DISCOUNT, value: 12.5 },
      })
    ).id;
  });

  afterEach(async () => {
    await prisma.streakPrize.deleteMany({ where: { rewardId } });
    await prisma.booking.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await prisma.streakReward.deleteMany({ where: { programId } });
    await prisma.streakProgram.deleteMany({ where: { id: programId } });
    await prisma.service.deleteMany({ where: { id: { in: [branchServiceId, otherBranchServiceId, personalServiceId] } } });
    await prisma.availability.deleteMany({ where: { id: availabilityId } });
    await prisma.branch.deleteMany({ where: { businessId } });
    await prisma.bookingSlug.deleteMany({ where: { OR: [{ businessId }, { userId }] } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe('listClientFileBookings', () => {
    const email = `carla-${tag}@example.com`;

    it('toma los Turnos de todas las Sucursales del Negocio, en orden y sin los Servicios personales', async () => {
      const later = await createTurno(branchServiceId, email, { startsAt: hoursAgo(50) });
      const earlier = await createTurno(otherBranchServiceId, email, { startsAt: hoursAgo(90) });
      await createTurno(personalServiceId, email, { startsAt: hoursAgo(70) });

      const found = await prizes.listClientFileBookings(ofBusiness, [email]);

      expect(found.map((b) => b.startsAt)).toEqual([earlier.startsAt, later.startsAt]);
      expect(found[0]).toEqual(
        expect.objectContaining({
          email,
          clientName: 'Carla',
          link: earlier.link,
          timeZone: 'America/Argentina/Buenos_Aires',
          status: BookingStatus.BOOKED,
          noShowAt: null,
          employeeNoShowAt: null,
        }),
      );
    });

    it('toma solo los Servicios personales del Usuario, con la zona de su Availability', async () => {
      await createTurno(branchServiceId, email);
      const own = await createTurno(personalServiceId, email);

      const found = await prizes.listClientFileBookings(personal, [email]);

      expect(found).toEqual([expect.objectContaining({ link: own.link, timeZone: 'Europe/Madrid' })]);
    });

    it('con un Servicio personal dado de baja, usa la zona de la Availability predeterminada del Usuario', async () => {
      const retired = await service({ userId, availabilityId }, 'retirado');
      const fallback = await prisma.availability.create({
        data: { userId, name: `${tag}-default`, timeZone: 'Asia/Tokyo', isDefault: true },
      });
      await createTurno(retired.id, email);
      await prisma.service.update({
        where: { id: retired.id },
        data: { deletedAt: NOW, availabilityId: null },
      });

      const found = await prizes.listClientFileBookings(personal, [email]);

      expect(found).toEqual([expect.objectContaining({ timeZone: 'Asia/Tokyo' })]);
      await prisma.booking.deleteMany({ where: { serviceId: retired.id } });
      await prisma.service.delete({ where: { id: retired.id } });
      await prisma.availability.delete({ where: { id: fallback.id } });
    });

    it('junta el email sin distinguir mayúsculas y lo devuelve en minúsculas', async () => {
      await createTurno(branchServiceId, email.toUpperCase());

      const found = await prizes.listClientFileBookings(ofBusiness, [email]);

      expect(found).toEqual([expect.objectContaining({ email })]);
    });

    it('no trae a otro email', async () => {
      await createTurno(branchServiceId, `otra-${email}`);

      await expect(prizes.listClientFileBookings(ofBusiness, [email])).resolves.toEqual([]);
    });

    it('saca los originales reagendados y trae los cancelados y las Ausencias, que decide el cálculo', async () => {
      await createTurno(branchServiceId, email, { status: BookingStatus.CANCELLED, rescheduled: true });
      await createTurno(branchServiceId, email, { status: BookingStatus.CANCELLED });
      await createTurno(branchServiceId, email, { noShowAt: NOW });

      const found = await prizes.listClientFileBookings(ofBusiness, [email]);

      expect(found.map((b) => b.status)).toEqual(expect.arrayContaining([BookingStatus.CANCELLED, BookingStatus.BOOKED]));
      expect(found).toHaveLength(2);
      expect(found.find((b) => b.status === BookingStatus.BOOKED)?.noShowAt).toEqual(NOW);
    });
  });

  describe('listEmailsAttendedBetween', () => {
    const email = `dani-${tag}@example.com`;
    const list = (owner: StreakProgramOwner) => prizes.listEmailsAttendedBetween(owner, hoursAgo(100), NOW);

    it('devuelve una vez cada email con un Turno atendido en el rango, en minúsculas', async () => {
      await createTurno(branchServiceId, email.toUpperCase(), { startsAt: hoursAgo(50) });
      await createTurno(otherBranchServiceId, email, { startsAt: hoursAgo(60) });

      await expect(list(ofBusiness)).resolves.toEqual([email]);
    });

    it('separa los alcances', async () => {
      await createTurno(personalServiceId, email, { startsAt: hoursAgo(50) });

      await expect(list(ofBusiness)).resolves.toEqual([]);
      await expect(list(personal)).resolves.toEqual([email]);
    });

    it.each([
      ['empezó antes del rango', { startsAt: hoursAgo(200) }],
      ['todavía no terminó', { startsAt: new Date(NOW.getTime() - 60_000) }],
      ['tiene Ausencia del Invitado', { startsAt: hoursAgo(50), noShowAt: NOW }],
      ['tiene Ausencia del Anfitrión', { startsAt: hoursAgo(50), employeeNoShowAt: NOW }],
      ['está cancelado', { startsAt: hoursAgo(50), status: BookingStatus.CANCELLED }],
      ['está pendiente', { startsAt: hoursAgo(50), status: BookingStatus.PENDING }],
      ['es un original reagendado', { startsAt: hoursAgo(50), status: BookingStatus.CANCELLED, rescheduled: true }],
    ])('no cuenta un Turno que %s', async (_case, over) => {
      await createTurno(branchServiceId, email, over);

      await expect(list(ofBusiness)).resolves.toEqual([]);
    });
  });

  describe('createMany y el unique del Premio', () => {
    it('guarda el Premio con su copia y lo devuelve', async () => {
      const created = await prizes.createMany([prize()]);

      expect(created).toEqual([prize()]);
      await expect(prizes.listGrantedKeys([rewardId], [prize().clientEmail])).resolves.toEqual([
        {
          rewardId,
          clientEmail: prize().clientEmail,
          streakStartedAt: prize().streakStartedAt,
          reachedCount: 5,
        },
      ]);
    });

    it('saltea el duplicado y devuelve solo los nuevos', async () => {
      await prizes.createMany([prize()]);

      const created = await prizes.createMany([prize(), prize({ reachedCount: 10 })]);

      expect(created.map((p) => p.reachedCount)).toEqual([10]);
      expect(await prisma.streakPrize.count({ where: { rewardId } })).toBe(2);
    });

    it('dos escrituras a la vez dejan un solo Premio y uno solo se devuelve como nuevo', async () => {
      const results = await Promise.all([prizes.createMany([prize()]), prizes.createMany([prize()])]);

      expect(results.flat()).toHaveLength(1);
      expect(await prisma.streakPrize.count({ where: { rewardId } })).toBe(1);
    });

    it('otra Racha, con otro inicio, vuelve a ganarlo', async () => {
      await prizes.createMany([prize()]);

      await expect(prizes.createMany([prize({ streakStartedAt: hoursAgo(10) })])).resolves.toHaveLength(1);
    });

    it('el CHECK rechaza un Premio con los dos dueños o el email con mayúsculas', async () => {
      const base = { rewardId, streakStartedAt: NOW, reachedCount: 1, type: StreakRewardType.GIFT, grantedAt: NOW };

      await expect(
        prisma.streakPrize.create({ data: { ...base, businessId, userId, clientEmail: 'a@b.com' } }),
      ).rejects.toThrow();
      await expect(
        prisma.streakPrize.create({ data: { ...base, businessId, clientEmail: 'A@b.com' } }),
      ).rejects.toThrow();
    });
  });

  describe('Premios disponibles y Canjear', () => {
    const email = `carla-${tag}@example.com`;
    const create = async (over: Partial<NewStreakPrize> = {}) => {
      const made = prize({ clientEmail: email, ...over });
      await prizes.createMany([made]);
      return (await prisma.streakPrize.findFirstOrThrow({
        where: { rewardId, clientEmail: made.clientEmail, reachedCount: made.reachedCount },
      })).id;
    };

    it('lista los disponibles de la Ficha del más viejo al más nuevo, sin los Canjeados ni los vencidos', async () => {
      const newest = await create({ reachedCount: 1, grantedAt: hoursAgo(1) });
      const oldest = await create({ reachedCount: 2, grantedAt: hoursAgo(5) });
      const expiring = await create({ reachedCount: 3, grantedAt: hoursAgo(3), expiresAt: new Date(NOW.getTime() + 1) });
      await create({ reachedCount: 4, grantedAt: hoursAgo(4), expiresAt: NOW });
      const redeemed = await create({ reachedCount: 6, grantedAt: hoursAgo(6) });
      await prisma.streakPrize.update({ where: { id: redeemed }, data: { redeemedAt: NOW } });
      await create({ reachedCount: 7, clientEmail: `otra-${email}` });
      await create({ reachedCount: 8, owner: personal });

      const found = await prizes.listAvailable(ofBusiness, email, NOW);

      expect(found.map(({ id }) => id)).toEqual([oldest, expiring, newest]);
      expect(found[0]).toEqual({
        id: oldest,
        type: StreakRewardType.PERCENT_DISCOUNT,
        value: 12.5,
        description: null,
        serviceName: null,
        grantedAt: hoursAgo(5),
        expiresAt: null,
        redeemedAt: null,
      });
    });

    it('findById trae el Premio con su Ficha, o null', async () => {
      const id = await create();

      await expect(prizes.findById(id)).resolves.toMatchObject({ id, owner: ofBusiness, clientEmail: email });
      await expect(prizes.findById(id + 1_000_000)).resolves.toBeNull();
    });

    it('findOwnerByBookingId es el Negocio del Servicio, o el Usuario de un Servicio personal', async () => {
      const inBranch = await createTurno(branchServiceId, email);
      const own = await createTurno(personalServiceId, email);

      await expect(prizes.findOwnerByBookingId(inBranch.id)).resolves.toEqual(ofBusiness);
      await expect(prizes.findOwnerByBookingId(own.id)).resolves.toEqual(personal);
      await expect(prizes.findOwnerByBookingId(inBranch.id + 1_000_000)).rejects.toThrow('Booking not found');
    });

    it('Canjea una vez: guarda cuándo, en qué Turno y quién', async () => {
      const id = await create();
      const turno = await createTurno(branchServiceId, email);

      const redeemed = await prizes.redeem(id, turno.id, userId, NOW);

      expect(redeemed).toMatchObject({ id, redeemedAt: NOW });
      await expect(prisma.streakPrize.findUniqueOrThrow({ where: { id } })).resolves.toMatchObject({
        redeemedAt: NOW,
        redeemedBookingId: turno.id,
        redeemedByUserId: userId,
      });
      await expect(prizes.redeem(id, turno.id, userId, NOW)).rejects.toThrow(`Prize ${id} already redeemed`);
    });

    it('dos Canjes a la vez dejan uno solo, y el otro recibe el Conflicto', async () => {
      const id = await create();
      const first = await createTurno(branchServiceId, email);
      const second = await createTurno(otherBranchServiceId, email);

      const results = await Promise.allSettled([
        prizes.redeem(id, first.id, userId, NOW),
        prizes.redeem(id, second.id, userId, NOW),
      ]);

      expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
      const [failed] = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(failed.reason.message).toBe(`Prize ${id} already redeemed`);
      const stored = await prisma.streakPrize.findUniqueOrThrow({ where: { id } });
      expect([first.id, second.id]).toContain(stored.redeemedBookingId);
    });
  });

  describe('listActiveIncludeRewards', () => {
    const mine = async () =>
      (await programs.listActiveIncludeRewards()).filter(
        ({ owner }) => owner.kind === 'business' && owner.businessId === businessId,
      );

    it('trae el programa activo con la copia de sus Recompensas', async () => {
      await expect(mine()).resolves.toEqual([
        {
          owner: ofBusiness,
          burnAfterDays: 30,
          rewards: [expect.objectContaining({ id: rewardId, value: 12.5, serviceName: null, validForDays: null })],
        },
      ]);
    });

    it('no trae un programa apagado', async () => {
      await prisma.streakProgram.update({ where: { id: programId }, data: { active: false } });

      await expect(mine()).resolves.toEqual([]);
      await prisma.streakProgram.update({ where: { id: programId }, data: { active: true } });
    });

    it('no trae las Recompensas borradas, y sin ninguna tampoco el programa', async () => {
      await prisma.streakReward.update({ where: { id: rewardId }, data: { deletedAt: NOW } });

      await expect(mine()).resolves.toEqual([]);
      await prisma.streakReward.update({ where: { id: rewardId }, data: { deletedAt: null } });
    });

    it('no trae el programa de un Negocio dado de baja', async () => {
      await prisma.business.update({ where: { id: businessId }, data: { deletedAt: NOW } });

      await expect(mine()).resolves.toEqual([]);
      await prisma.business.update({ where: { id: businessId }, data: { deletedAt: null } });
    });

    it('no trae un Servicio gratis dado de baja', async () => {
      const free = await prisma.streakReward.create({
        data: { programId, requiredCount: 9, repeatable: false, type: StreakRewardType.FREE_SERVICE, serviceId: branchServiceId },
      });
      await prisma.service.update({ where: { id: branchServiceId }, data: { deletedAt: NOW } });

      const [program] = await mine();

      expect(program.rewards.map(({ id }) => id)).toEqual([rewardId]);
      await prisma.service.update({ where: { id: branchServiceId }, data: { deletedAt: null } });
      await prisma.streakReward.delete({ where: { id: free.id } });
    });
  });
});
