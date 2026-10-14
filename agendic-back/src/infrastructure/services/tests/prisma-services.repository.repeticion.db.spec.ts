import 'dotenv/config';
import { PrismaService } from '../../prisma.service';

/** Runs against the real database: the Repetición CHECKs are Postgres's job (ADR 0004). */
describe('Service Repetición (real database)', () => {
  const prisma = new PrismaService();
  const tag = `repeticion-${Date.now()}`;
  let userId: number;
  let availabilityId: number;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        clerkId: tag,
        name: tag,
        email: `${tag}@example.com`,
        availabilities: {
          create: {
            name: 'Horas laborables',
            timeZone: 'America/Argentina/Buenos_Aires',
            isDefault: true,
          },
        },
      },
      include: { availabilities: true },
    });
    userId = user.id;
    availabilityId = user.availabilities[0].id;
  });

  afterAll(async () => {
    await prisma.service.deleteMany({ where: { userId } });
    await prisma.availability.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  const create = (repeat: {
    repeatEveryWeeks: number | null;
    repeatMaxBookings: number | null;
  }) =>
    prisma.service.create({
      data: {
        userId,
        availabilityId,
        name: `s-${Math.random()}`,
        category: 'SPA',
        durationMinutes: 30,
        price: 10,
        slug: `s-${Math.random()}`.replace('.', ''),
        ...repeat,
      },
    });

  it('accepts both fields set, or both null', async () => {
    await expect(
      create({ repeatEveryWeeks: 2, repeatMaxBookings: 10 }),
    ).resolves.toMatchObject({ repeatEveryWeeks: 2, repeatMaxBookings: 10 });
    await expect(
      create({ repeatEveryWeeks: null, repeatMaxBookings: null }),
    ).resolves.toMatchObject({ repeatEveryWeeks: null });
  });

  it.each([
    ['only repeatEveryWeeks', { repeatEveryWeeks: 2, repeatMaxBookings: null }],
    ['only repeatMaxBookings', { repeatEveryWeeks: null, repeatMaxBookings: 4 }],
    ['a repeatEveryWeeks of 0', { repeatEveryWeeks: 0, repeatMaxBookings: 4 }],
    ['a repeatMaxBookings of 1', { repeatEveryWeeks: 1, repeatMaxBookings: 1 }],
    ['a repeatMaxBookings of 11', { repeatEveryWeeks: 1, repeatMaxBookings: 11 }],
  ])('refuses %s', async (_, repeat) => {
    await expect(create(repeat)).rejects.toThrow();
  });
});
