import 'dotenv/config';
import { BookingStatus } from '../../../domain/bookings/booking';
import { PrismaService } from '../../prisma.service';
import { PrismaBookingsRepository } from '../prisma-bookings.repository';

/** Runs against the real database: the Cliente table and its email index are what the migration promises. */
describe('PrismaBookingsRepository (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaBookingsRepository(prisma);
  const tag = `client-table-${Date.now()}`;
  const email = `${tag}@example.com`;
  let userId: number;

  const book = (hour: number, clientName: string, clientEmail: string, serviceId: number) =>
    repository.create(
      {
        serviceId,
        employeeId: null,
        userId,
        clientName,
        clientEmail,
        prepStartsAt: new Date(Date.UTC(2031, 0, 1, hour)),
        startsAt: new Date(Date.UTC(2031, 0, 1, hour)),
        endsAt: new Date(Date.UTC(2031, 0, 1, hour + 1)),
        notes: null,
      },
      new Date(Date.UTC(2031, 0, 2)),
    );

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { userId } });
    await prisma.service.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('finds every Turno booked with an email, one Cliente row per Turno', async () => {
    userId = (
      await prisma.user.create({ data: { clerkId: tag, name: tag, email } })
    ).id;
    const { id: serviceId } = await prisma.service.create({
      data: {
        userId,
        name: tag,
        slug: tag,
        category: 'CLINICA',
        durationMinutes: 60,
        price: 1,
      },
    });
    await book(10, 'Bruno', email, serviceId);
    await book(12, 'Bruno D.', email, serviceId);
    await book(14, 'Otra', `other-${email}`, serviceId);

    const found = await repository.findByClientEmail(email);

    expect(found.map((b) => [b.clientName, b.clientEmail, b.status])).toEqual([
      ['Bruno', email, BookingStatus.UNVERIFIED],
      ['Bruno D.', email, BookingStatus.UNVERIFIED],
    ]);
    expect(await prisma.client.count({ where: { email } })).toBe(2);
  }, 60_000);
});
