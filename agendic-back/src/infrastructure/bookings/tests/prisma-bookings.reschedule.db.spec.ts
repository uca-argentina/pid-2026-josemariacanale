import 'dotenv/config';
import { BookingStatus } from '../../../domain/bookings/booking';
import { ConflictError } from '../../../domain/errors';
import { PrismaService } from '../../prisma.service';
import { PrismaBookingsRepository } from '../prisma-bookings.repository';

/** Runs against the real database: Reagendar replaces the Turno in one transaction (ADR 0031). */
describe('PrismaBookingsRepository, Reagendar (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaBookingsRepository(prisma);
  const tag = `booking-reschedule-${Date.now()}`;
  const at = (hours: number) => new Date(Date.UTC(2031, 0, 1) + hours * 3_600_000);
  const NOW = new Date('2031-01-01T00:00:00.000Z');
  let userId: number;
  let serviceId: number;

  const book = (hour: number) =>
    repository.create({
      serviceId,
      employeeId: null,
      userId,
      cabinId: null,
      clientName: 'Bruno',
      clientEmail: `${tag}@example.com`,
      prepStartsAt: at(hour),
      startsAt: at(hour),
      endsAt: at(hour + 1),
      notes: 'Llego tarde',
      employeeChosen: true,
      depositAmount: 10,
      price: 50,
      status: BookingStatus.BOOKED,
    });

  const times = (hour: number) => ({
    employeeId: null,
    userId,
    cabinId: null,
    prepStartsAt: at(hour),
    startsAt: at(hour),
    endsAt: at(hour + 1),
  });

  beforeAll(async () => {
    userId = (
      await prisma.user.create({
        data: { clerkId: tag, name: tag, email: `${tag}@example.com` },
      })
    ).id;
    const { id: availabilityId } = await prisma.availability.create({
      data: { userId, name: 'Horas laborables', timeZone: 'UTC', isDefault: true },
    });
    serviceId = (
      await prisma.service.create({
        data: {
          userId,
          availabilityId,
          name: tag,
          slug: tag,
          category: 'CLINICA',
          durationMinutes: 60,
          price: 50,
        },
      })
    ).id;
  }, 60_000);

  afterAll(async () => {
    await prisma.booking.updateMany({ where: { userId }, data: { fromRescheduleId: null } });
    await prisma.booking.deleteMany({ where: { userId } });
    await prisma.service.deleteMany({ where: { userId } });
    await prisma.availability.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('cancels the original as rescheduled and creates the new Turno with its Enlace, Cliente and Seña', async () => {
    const original = await book(1);
    await prisma.booking.update({ where: { id: original.id }, data: { depositPaidAt: NOW } });

    const moved = await repository.reschedule(original.id, times(3), NOW);

    expect(moved).toMatchObject({
      status: BookingStatus.BOOKED,
      startsAt: at(3),
      fromRescheduleId: original.id,
      link: original.link,
      clientName: 'Bruno',
      clientEmail: `${tag}@example.com`,
      notes: 'Llego tarde',
      employeeChosen: true,
      price: 50,
      depositAmount: 10,
      depositPaidAt: NOW,
    });
    expect(moved.id).not.toBe(original.id);
    expect(await prisma.booking.findUnique({ where: { id: original.id } })).toMatchObject({
      status: BookingStatus.CANCELLED,
      cancelledAt: NOW,
      rescheduled: true,
      link: null,
    });
    expect((await repository.findByLink(original.link!)).id).toBe(moved.id);
    expect((await repository.listByUser(userId)).map((b) => b.id)).not.toContain(original.id);
  }, 60_000);

  it('leaves the original untouched when creating the new Turno fails', async () => {
    const original = await book(5);
    await book(7);

    await expect(repository.reschedule(original.id, times(7), NOW)).rejects.toBeInstanceOf(
      ConflictError,
    );

    expect(await prisma.booking.findUnique({ where: { id: original.id } })).toMatchObject({
      status: BookingStatus.BOOKED,
      cancelledAt: null,
      rescheduled: null,
      link: original.link,
    });
  }, 60_000);
});
