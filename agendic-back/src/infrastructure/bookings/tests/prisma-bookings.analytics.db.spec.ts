import 'dotenv/config';
import { BookingStatus } from '../../../domain/bookings/booking';
import { PrismaService } from '../../prisma.service';
import { cancelFutureBooked } from '../cancel-future-booked';
import { PrismaBookingsRepository } from '../prisma-bookings.repository';

/** Runs against the real database: the CHECKs on cancelledAt / rejectedAt are Postgres's job (ADR 0004). */
describe('PrismaBookingsRepository, price, cancelledAt y rejectedAt (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaBookingsRepository(prisma);
  const tag = `booking-analytics-${Date.now()}`;
  const at = new Date('2031-01-01T10:00:00.000Z');
  let userId: number;
  let serviceId: number;
  let hour = 0;

  const book = (status: BookingStatus.BOOKED | BookingStatus.PENDING = BookingStatus.BOOKED) => {
    hour += 1;
    const startsAt = new Date(at.getTime() + hour * 3_600_000);
    return repository.create({
      serviceId,
      employeeId: null,
      userId,
      cabinId: null,
      clientName: 'Bruno',
      clientEmail: `${tag}@example.com`,
      prepStartsAt: startsAt,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 1_800_000),
      notes: null,
      employeeChosen: false,
      depositAmount: null,
      price: 1234.5,
      status,
    });
  };

  beforeAll(async () => {
    ({ id: userId } = await prisma.user.create({
      data: { clerkId: tag, name: tag, email: `${tag}@example.com` },
    }));
    const availability = await prisma.availability.create({
      data: { userId, name: tag, timeZone: 'UTC', isDefault: true },
    });
    ({ id: serviceId } = await prisma.service.create({
      data: {
        userId,
        availabilityId: availability.id,
        name: tag,
        slug: tag,
        category: 'CLINICA',
        durationMinutes: 30,
        price: 1234.5,
      },
    }));
  }, 60_000);

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { userId } });
    await prisma.service.deleteMany({ where: { userId } });
    await prisma.availability.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('keeps the price fixed at booking when the Servicio changes its price', async () => {
    const booking = await book();
    await prisma.service.update({ where: { id: serviceId }, data: { price: 99 } });

    expect((await repository.findById(booking.id)).price).toBe(1234.5);
  });

  it('writes cancelledAt on cancel and cancelPendingOrBooked, and rejectedAt on reject', async () => {
    const now = new Date('2031-01-01T09:00:00.000Z');
    const cancelled = await book();
    const cancelledByLink = await book(BookingStatus.PENDING);
    const rejected = await book(BookingStatus.PENDING);
    const accepted = await book(BookingStatus.PENDING);

    await repository.cancel(cancelled.id, now);
    await repository.cancelPendingOrBooked(cancelledByLink.id, now);
    await repository.resolvePending(rejected.id, BookingStatus.REJECTED, now);
    await repository.resolvePending(accepted.id, BookingStatus.BOOKED, now);

    const rows = await Promise.all(
      [cancelled, cancelledByLink, rejected, accepted].map((b) => repository.findById(b.id)),
    );
    expect(rows.map((b) => [b.status, b.cancelledAt, b.rejectedAt])).toEqual([
      [BookingStatus.CANCELLED, now, null],
      [BookingStatus.CANCELLED, now, null],
      [BookingStatus.REJECTED, null, now],
      [BookingStatus.BOOKED, null, null],
    ]);
  });

  it('writes cancelledAt when Dar de baja cancels future Turnos', async () => {
    const booking = await book();
    const now = new Date('2031-01-01T00:00:00.000Z');

    await prisma.$transaction((tx) => cancelFutureBooked(tx, { serviceId }, now));

    expect((await repository.findById(booking.id)).cancelledAt).toEqual(now);
  });

  it('rejects a cancelledAt without CANCELLED and a rejectedAt without REJECTED', async () => {
    const booking = await book();

    await expect(
      prisma.booking.update({ where: { id: booking.id }, data: { cancelledAt: at } }),
    ).rejects.toThrow(/Booking_cancelledAt_only_cancelled/);
    await expect(
      prisma.booking.update({ where: { id: booking.id }, data: { rejectedAt: at } }),
    ).rejects.toThrow(/Booking_rejectedAt_only_rejected/);
  });
});
