import 'dotenv/config';
import { PrismaService } from '../prisma.service';
import { PrismaCalendarConnectionsRepository } from './prisma-calendar-connections.repository';

/** Runs against the real database: which calendars are ticked survives a reconnection of the same account only (ADR 0038). */
describe('PrismaCalendarConnectionsRepository checked calendars (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaCalendarConnectionsRepository(prisma);
  const tag = `calendar-checked-${Date.now()}`;
  const original = { ...process.env };
  let userId: number;

  const connect = (email: string) =>
    repository.save(userId, {
      provider: 'GOOGLE',
      email,
      refreshToken: 'refresh',
      connectedAt: new Date(),
    });

  beforeAll(async () => {
    process.env.CALENDAR_TOKEN_KEY = Buffer.alloc(32, 7).toString('base64');
    userId = (
      await prisma.user.create({
        data: { clerkId: tag, name: tag, email: `${tag}@example.com` },
      })
    ).id;
  });

  afterAll(async () => {
    process.env = { ...original };
    // `deleteMany({ where: { userId: undefined } })` matches every row: skip if the test died before creating the User.
    if (userId !== undefined) {
      await prisma.calendarConnection.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('a new connection ticks only the primary calendar', async () => {
    await connect('ana@gmail.com');

    await expect(repository.findCheckedCalendarIdsByUserId(userId)).resolves.toEqual(['primary']);
  });

  it('saves the ticked calendars, an empty list included', async () => {
    await repository.saveCheckedCalendarIds(userId, ['trabajo']);
    await expect(repository.findCheckedCalendarIdsByUserId(userId)).resolves.toEqual(['trabajo']);

    await repository.saveCheckedCalendarIds(userId, []);
    await expect(repository.findCheckedCalendarIdsByUserId(userId)).resolves.toEqual([]);
  });

  it('reconnecting the same account keeps the selection', async () => {
    await repository.saveCheckedCalendarIds(userId, ['trabajo']);

    await connect('Ana@gmail.com');

    await expect(repository.findCheckedCalendarIdsByUserId(userId)).resolves.toEqual(['trabajo']);
  });

  it('connecting another account goes back to the primary calendar', async () => {
    await repository.saveCheckedCalendarIds(userId, ['trabajo']);

    await connect('otra@gmail.com');

    await expect(repository.findCheckedCalendarIdsByUserId(userId)).resolves.toEqual(['primary']);
  });

  it('answers an empty list without a connection', async () => {
    await repository.deleteByUserId(userId);

    await expect(repository.findCheckedCalendarIdsByUserId(userId)).resolves.toEqual([]);
  });
});
