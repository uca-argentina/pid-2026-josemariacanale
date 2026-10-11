import 'dotenv/config';
import { ConflictError } from '../../../domain/errors';
import { OutOfOfficeReason } from '../../../domain/out-of-office/out-of-office';
import { PrismaService } from '../../prisma.service';
import { PrismaOutOfOfficeRepository } from '../prisma-out-of-office.repository';

/** Runs against the real database: the filter, the order and the unique index are what the migration promises. */
describe('PrismaOutOfOfficeRepository (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaOutOfOfficeRepository(prisma);
  const tag = `out-of-office-${Date.now()}`;
  let userId: number;

  const period = (startDate: string, endDate: string) => ({
    startDate,
    endDate,
    reason: OutOfOfficeReason.VACATION,
    notes: null,
    showNotePublicly: false,
  });

  beforeAll(async () => {
    userId = (
      await prisma.user.create({
        data: { clerkId: tag, name: tag, email: `${tag}@example.com` },
      })
    ).id;
  });

  afterAll(async () => {
    // `deleteMany({ where: { userId: undefined } })` matches every row: skip if the test died before creating the User.
    if (userId !== undefined) {
      await prisma.outOfOffice.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('lists only the períodos that have not ended, by start date, with the day counted as inclusive', async () => {
    await repository.create(userId, period('2031-03-10', '2031-03-12'));
    await repository.create(userId, period('2031-01-01', '2031-01-02'));
    await repository.create(userId, period('2031-02-01', '2031-02-10'));
    await repository.create(userId, period('2031-02-05', '2031-02-05'));

    const listed = await repository.listByUserEndingFrom(userId, '2031-02-05');

    expect(listed.map(({ startDate, endDate }) => [startDate, endDate])).toEqual([
      ['2031-02-01', '2031-02-10'],
      ['2031-02-05', '2031-02-05'],
      ['2031-03-10', '2031-03-12'],
    ]);
  });

  it('answers ConflictError for two períodos of a Usuario with the same dates', async () => {
    await repository.create(userId, period('2032-05-01', '2032-05-03'));

    await expect(
      repository.create(userId, period('2032-05-01', '2032-05-03')),
    ).rejects.toThrow(ConflictError);
    expect(
      await repository.findByUserAndDates(userId, '2032-05-01', '2032-05-03'),
    ).toMatchObject({ userId, startDate: '2032-05-01', endDate: '2032-05-03' });
  });
});
