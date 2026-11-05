import 'dotenv/config';
import { ServiceCategory } from '../../../domain/services/service';
import {
  StreakProgramOwner,
  StreakRewardTerms,
  StreakRewardType,
} from '../../../domain/streaks/streak-program';
import { PrismaService } from '../../prisma.service';
import { PrismaStreakProgramsRepository } from '../prisma-streak-programs.repository';

const GIFT: StreakRewardTerms = {
  requiredCount: 5,
  repeatable: false,
  type: StreakRewardType.GIFT,
  value: null,
  description: 'Un lavado',
  serviceId: null,
  validForDays: null,
};

/** Runs against the real database: the program's single owner and its unique per owner are Postgres's job (ADR 0004). */
describe('PrismaStreakProgramsRepository (real database)', () => {
  const prisma = new PrismaService();
  const programs = new PrismaStreakProgramsRepository(prisma);
  const tag = `streak-${Date.now()}`;
  let userId: number;
  let otherUserId: number;
  let businessId: number;
  let serviceId: number;
  let personal: StreakProgramOwner;
  let ofBusiness: StreakProgramOwner;

  const createUser = async (suffix: string) =>
    (
      await prisma.user.create({
        data: {
          clerkId: `${tag}-${suffix}`,
          name: tag,
          email: `${tag}-${suffix}@example.com`,
        },
      })
    ).id;

  beforeAll(async () => {
    userId = await createUser('a');
    otherUserId = await createUser('b');
    businessId = (
      await prisma.business.create({
        data: { name: tag, description: tag, ownerId: userId, slug: tag },
      })
    ).id;
    serviceId = (
      await prisma.service.create({
        data: {
          userId,
          name: tag,
          category: ServiceCategory.OTRO,
          durationMinutes: 30,
          price: 10,
          slug: tag,
        },
      })
    ).id;
    personal = { kind: 'personal', userId };
    ofBusiness = { kind: 'business', businessId };
  });

  afterEach(async () => {
    await prisma.streakReward.deleteMany({
      where: { program: { OR: [{ businessId }, { userId }] } },
    });
    await prisma.streakProgram.deleteMany({
      where: { OR: [{ businessId }, { userId }] },
    });
  });

  afterAll(async () => {
    await prisma.service.delete({ where: { id: serviceId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.user.deleteMany({
      where: { id: { in: [userId, otherUserId] } },
    });
    await prisma.$disconnect();
  });

  it('rejects a program with both owners', async () => {
    await expect(
      prisma.streakProgram.create({ data: { businessId, userId } }),
    ).rejects.toThrow();
  });

  it('rejects a program with no owner', async () => {
    await expect(prisma.streakProgram.create({ data: {} })).rejects.toThrow();
  });

  it('rejects a second program of the same Negocio or Usuario', async () => {
    await prisma.streakProgram.create({ data: { businessId } });
    await prisma.streakProgram.create({ data: { userId } });

    await expect(
      prisma.streakProgram.create({ data: { businessId } }),
    ).rejects.toThrow();
    await expect(
      prisma.streakProgram.create({ data: { userId } }),
    ).rejects.toThrow();
  });

  it.each([0, 366])('rejects a burnAfterDays of %p', async (burnAfterDays) => {
    await expect(
      prisma.streakProgram.create({ data: { userId, burnAfterDays } }),
    ).rejects.toThrow();
  });

  it('save creates the program once and then updates it', async () => {
    await programs.save(personal, { active: true, burnAfterDays: 30 });
    const saved = await programs.save(personal, {
      active: false,
      burnAfterDays: 7,
    });

    expect(saved).toEqual({ active: false, burnAfterDays: 7, rewards: [] });
    expect(await prisma.streakProgram.count({ where: { userId } })).toBe(1);
  });

  it('createReward creates the program off and without Tiempo de quemada when there is none', async () => {
    await programs.createReward(ofBusiness, GIFT);

    expect(await programs.findByOwnerIncludeRewards(ofBusiness)).toMatchObject({
      active: false,
      burnAfterDays: null,
    });
  });

  it('createReward uses the program there is, and two at once leave a single one', async () => {
    await Promise.all([
      programs.createReward(personal, GIFT),
      programs.createReward(personal, GIFT),
    ]);

    expect(await prisma.streakProgram.count({ where: { userId } })).toBe(1);
    expect(
      (await programs.findByOwnerIncludeRewards(personal))?.rewards,
    ).toHaveLength(2);
  });

  it('keeps a program of a Negocio apart from the one of its Dueño', async () => {
    await programs.createReward(ofBusiness, GIFT);

    expect(await programs.findByOwnerIncludeRewards(personal)).toBeNull();
  });

  it('lists the Recompensas by requiredCount, without the borradas', async () => {
    const ten = await programs.createReward(personal, {
      ...GIFT,
      requiredCount: 10,
    });
    const three = await programs.createReward(personal, {
      ...GIFT,
      requiredCount: 3,
    });
    const five = await programs.createReward(personal, GIFT);
    await programs.deleteReward(five.id);

    const found = await programs.findByOwnerIncludeRewards(personal);

    expect(found?.rewards.map((r) => r.id)).toEqual([three.id, ten.id]);
  });

  it('borrar keeps the row, and finds it marked', async () => {
    const reward = await programs.createReward(personal, GIFT);

    await programs.deleteReward(reward.id);

    expect(
      await programs.findRewardByIdIncludeProgram(reward.id),
    ).toMatchObject({
      id: reward.id,
      owner: personal,
      deletedAt: expect.any(Date),
    });
  });

  it('borrar twice keeps the first date', async () => {
    const reward = await programs.createReward(personal, GIFT);
    await programs.deleteReward(reward.id);
    const first = await programs.findRewardByIdIncludeProgram(reward.id);

    await programs.deleteReward(reward.id);

    expect(
      (await programs.findRewardByIdIncludeProgram(reward.id))?.deletedAt,
    ).toEqual(first?.deletedAt);
  });

  it('updateReward changes the row in place, and refuses a borrada', async () => {
    const reward = await programs.createReward(personal, GIFT);

    const updated = await programs.updateReward(reward.id, {
      ...GIFT,
      type: StreakRewardType.AMOUNT_DISCOUNT,
      value: 1500.5,
      description: null,
    });

    expect(updated).toMatchObject({
      id: reward.id,
      type: StreakRewardType.AMOUNT_DISCOUNT,
      value: 1500.5,
      description: null,
    });

    await programs.deleteReward(reward.id);
    await expect(programs.updateReward(reward.id, GIFT)).rejects.toThrow(
      `Streak reward ${reward.id} not found`,
    );
  });

  it('answers the free Servicio with its name, also once dado de baja', async () => {
    const reward = await programs.createReward(personal, {
      ...GIFT,
      type: StreakRewardType.FREE_SERVICE,
      description: null,
      serviceId,
    });

    await prisma.service.update({
      where: { id: serviceId },
      data: { deletedAt: new Date() },
    });

    expect(
      (await programs.findRewardByIdIncludeProgram(reward.id))?.service,
    ).toEqual({
      id: serviceId,
      name: tag,
    });
  });

  it('rejects a requiredCount or validForDays of 0', async () => {
    await expect(
      programs.createReward(personal, { ...GIFT, requiredCount: 0 }),
    ).rejects.toThrow();
    await expect(
      programs.createReward(personal, { ...GIFT, validForDays: 0 }),
    ).rejects.toThrow();
  });
});
