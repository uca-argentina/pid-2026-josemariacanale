import 'dotenv/config';
import { BookingStatus } from '../../../domain/bookings/booking';
import { PrismaService } from '../../prisma.service';
import { PrismaBookingsRepository } from '../prisma-bookings.repository';

/** Runs against the real database: the zone of each Turno comes from the Availability it is attended with. */
describe('PrismaBookingsRepository.listUpcomingByUser (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaBookingsRepository(prisma);
  const tag = `upcoming-${Date.now()}`;
  let userId: number;
  let businessId: number;

  afterAll(async () => {
    // `deleteMany({ where: { userId: undefined } })` matches every row: skip if the test died before creating the User.
    if (userId !== undefined) {
      await prisma.booking.deleteMany({ where: { userId } });
      await prisma.employeeService.deleteMany({ where: { employee: { userId } } });
      await prisma.service.deleteMany({
        where: { OR: [{ userId }, { branch: { businessId } }] },
      });
      await prisma.employee.deleteMany({ where: { userId } });
      await prisma.branch.deleteMany({ where: { businessId } });
      await prisma.business.delete({ where: { id: businessId } });
      await prisma.availability.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('answers the pending and accepted Turnos from `from` on, each with the zone of its Availability', async () => {
    userId = (
      await prisma.user.create({
        data: { clerkId: tag, name: tag, email: `${tag}@example.com` },
      })
    ).id;
    const tokyo = await prisma.availability.create({
      data: { userId, name: 'Tokyo', timeZone: 'Asia/Tokyo', isDefault: true },
    });
    const buenosAires = await prisma.availability.create({
      data: {
        userId,
        name: 'BA',
        timeZone: 'America/Argentina/Buenos_Aires',
        isDefault: false,
      },
    });
    businessId = (
      await prisma.business.create({
        data: { name: tag, description: tag, ownerId: userId, slug: tag },
      })
    ).id;
    const { id: branchId } = await prisma.branch.create({
      data: {
        businessId,
        name: 'Downtown',
        address: '123 Main St',
        timeZone: 'Europe/Madrid',
        slug: 'downtown',
      },
    });
    const { id: employeeId } = await prisma.employee.create({
      data: { userId, businessId },
    });
    const service = { category: 'CLINICA', durationMinutes: 60, price: 1 } as const;
    const personal = await prisma.service.create({
      data: { ...service, userId, availabilityId: tokyo.id, name: 'p', slug: 'p' },
    });
    const shared = await prisma.service.create({
      data: { ...service, branchId, name: 's', slug: 's' },
    });
    await prisma.employeeService.create({
      data: { employeeId, serviceId: shared.id, availabilityId: buenosAires.id },
    });

    const book = (
      serviceId: number,
      employee: number | null,
      day: number,
      status: BookingStatus.PENDING | BookingStatus.BOOKED,
    ) =>
      repository.create({
        serviceId,
        employeeId: employee,
        userId,
        cabinId: null,
        clientName: `Cliente ${day}`,
        clientEmail: `${tag}@example.com`,
        prepStartsAt: new Date(Date.UTC(2031, 0, day, 10)),
        startsAt: new Date(Date.UTC(2031, 0, day, 10)),
        endsAt: new Date(Date.UTC(2031, 0, day, 11)),
        notes: null,
        employeeChosen: false,
        depositAmount: null,
        price: 50,
        status,
      });
    const past = await book(personal.id, null, 1, BookingStatus.BOOKED);
    const first = await book(personal.id, null, 5, BookingStatus.BOOKED);
    const second = await book(shared.id, employeeId, 6, BookingStatus.PENDING);
    const cancelled = await book(personal.id, null, 7, BookingStatus.BOOKED);
    await repository.cancel(cancelled.id, new Date());

    const upcoming = await repository.listUpcomingByUser(
      userId,
      new Date(Date.UTC(2031, 0, 2)),
    );

    expect(upcoming).toEqual([
      {
        id: first.id,
        startsAt: first.startsAt,
        clientName: 'Cliente 5',
        timeZone: 'Asia/Tokyo',
      },
      {
        id: second.id,
        startsAt: second.startsAt,
        clientName: 'Cliente 6',
        timeZone: 'America/Argentina/Buenos_Aires',
      },
    ]);
    expect(upcoming.map((b) => b.id)).not.toContain(past.id);
  }, 60_000);
});
