import 'dotenv/config';
import {
  BookingActor,
  BookingStatus,
  CancellationCause,
} from '../../../domain/bookings/booking';
import { emptySchedule } from '../../../domain/availabilities/availability';
import { PrismaBookingsRepository } from '../../bookings/prisma-bookings.repository';
import { PrismaService } from '../../prisma.service';
import { PrismaAvailabilitiesRepository } from '../prisma-availabilities.repository';

/** Runs against the real database: the Availability and the cancellations are one transaction (ADR 0034). */
describe('PrismaAvailabilitiesRepository.replaceCancelling (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaAvailabilitiesRepository(prisma);
  const bookings = new PrismaBookingsRepository(prisma);
  const tag = `availability-cancelling-${Date.now()}`;
  const now = new Date(Date.UTC(2031, 0, 10, 12));
  let userId: number;
  let availabilityId: number;
  let serviceId: number;

  const data = (timeZone = 'UTC') => ({
    name: 'Nueva',
    timeZone,
    schedule: emptySchedule().map((_, day) =>
      day === 3 ? [{ start: '09:00', end: '12:00' }] : [],
    ),
    overrides: [],
  });

  const book = (day: number, hour = 15) =>
    bookings.create({
      serviceId,
      employeeId: null,
      userId,
      cabinId: null,
      clientName: `Cliente ${day}`,
      clientEmail: `${tag}@example.com`,
      prepStartsAt: new Date(Date.UTC(2031, 0, day, hour)),
      startsAt: new Date(Date.UTC(2031, 0, day, hour)),
      endsAt: new Date(Date.UTC(2031, 0, day, hour + 1)),
      notes: null,
      employeeChosen: false,
      depositAmount: null,
      price: 50,
      status: BookingStatus.BOOKED,
      acceptedAt: new Date(),
    });

  const order = (id: number) => ({
    id,
    cause: CancellationCause.SCHEDULE_CHANGE,
    reason: 'Cambió sus horarios.',
  });

  beforeAll(async () => {
    userId = (
      await prisma.user.create({
        data: { clerkId: tag, name: tag, email: `${tag}@example.com` },
      })
    ).id;
    availabilityId = (
      await prisma.availability.create({
        data: { userId, name: 'BA', timeZone: 'UTC', isDefault: true },
      })
    ).id;
    serviceId = (
      await prisma.service.create({
        data: {
          userId,
          availabilityId,
          name: 'p',
          slug: 'p',
          category: 'CLINICA',
          durationMinutes: 60,
          price: 1,
        },
      })
    ).id;
  });

  afterAll(async () => {
    // `deleteMany({ where: { userId: undefined } })` matches every row: skip if the test died before creating the User.
    if (userId !== undefined) {
      await prisma.booking.deleteMany({ where: { userId } });
      await prisma.service.deleteMany({ where: { userId } });
      await prisma.availability.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('replaces the Availability and cancels the Turnos with the Motivo and the Causa in one transaction', async () => {
    const turno = await book(15);

    const { availability, cancelledIds } = await repository.replaceCancelling(
      availabilityId,
      data(),
      [order(turno.id)],
      now,
    );

    expect(availability).toMatchObject({ id: availabilityId, name: 'Nueva' });
    expect(availability.schedule[3]).toEqual([{ start: '09:00', end: '12:00' }]);
    expect(cancelledIds).toEqual([turno.id]);
    const row = await prisma.booking.findUniqueOrThrow({ where: { id: turno.id } });
    expect([row.status, row.cancelledBy, row.cancellationCause, row.cancellationReason]).toEqual([
      'CANCELLED',
      BookingActor.EMPLOYEE,
      'SCHEDULE_CHANGE',
      'Cambió sus horarios.',
    ]);
    expect(row.cancelledAt?.getTime()).toBe(now.getTime());
  });

  it('leaves alone a Turno that already started, and reports only the ones it cancelled', async () => {
    const open = await book(20);
    const started = await book(9);

    const { cancelledIds } = await repository.replaceCancelling(
      availabilityId,
      data(),
      [order(open.id), order(started.id)],
      now,
    );

    expect(cancelledIds).toEqual([open.id]);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: started.id } })).status).toBe('BOOKED');
  });

  it('keeps the Availability as it was when a cancellation fails', async () => {
    const before = await repository.findById(availabilityId);
    const turno = await book(26);
    // A Causa the database does not know makes the cancellation throw after the Franjas were rewritten.
    const unknown = { ...order(turno.id), cause: 'UNKNOWN' as CancellationCause };

    await expect(
      repository.replaceCancelling(availabilityId, { ...data(), name: 'Otra' }, [unknown], now),
    ).rejects.toThrow();

    expect(await repository.findById(availabilityId)).toEqual(before);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: turno.id } })).status).toBe('BOOKED');
  });
});
