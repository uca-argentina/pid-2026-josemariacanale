import 'dotenv/config';
import {
  BookingActor,
  BookingStatus,
  CancellationCause,
} from '../../../domain/bookings/booking';
import { PrismaBookingsRepository } from '../../bookings/prisma-bookings.repository';
import { PrismaService } from '../../prisma.service';
import { PrismaUserHolidaySettingsRepository } from '../prisma-user-holiday-settings.repository';

/** Runs against the real database: the Días festivos settings and the cancellations are one transaction (ADR 0034). */
describe('PrismaUserHolidaySettingsRepository.saveCancelling (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaUserHolidaySettingsRepository(prisma);
  const bookings = new PrismaBookingsRepository(prisma);
  const tag = `holidays-cancelling-${Date.now()}`;
  const now = new Date(Date.UTC(2031, 0, 10, 12));
  let userId: number;
  let serviceId: number;

  const book = (day: number) =>
    bookings.create({
      serviceId,
      employeeId: null,
      userId,
      cabinId: null,
      clientName: `Cliente ${day}`,
      clientEmail: `${tag}@example.com`,
      prepStartsAt: new Date(Date.UTC(2031, 0, day, 15)),
      startsAt: new Date(Date.UTC(2031, 0, day, 15)),
      endsAt: new Date(Date.UTC(2031, 0, day, 16)),
      notes: null,
      employeeChosen: false,
      depositAmount: null,
      price: 50,
      status: BookingStatus.BOOKED,
      acceptedAt: new Date(),
    });

  const order = (id: number) => ({
    id,
    cause: CancellationCause.PUBLIC_HOLIDAY,
    reason: 'Ana no atiende por Año Nuevo.',
  });

  beforeAll(async () => {
    userId = (
      await prisma.user.create({
        data: { clerkId: tag, name: tag, email: `${tag}@example.com` },
      })
    ).id;
    const availabilityId = (
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
      await prisma.userHolidaySettings.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('saves the settings and cancels the Turnos with the Motivo and the Causa in one transaction', async () => {
    const turno = await book(15);

    const cancelledIds = await repository.saveCancelling(
      userId,
      { countryCode: 'AR', disabledIds: ['a'] },
      [order(turno.id)],
      now,
    );

    expect(cancelledIds).toEqual([turno.id]);
    expect(await repository.findByUserId(userId)).toEqual({
      countryCode: 'AR',
      disabledIds: ['a'],
    });
    const row = await prisma.booking.findUniqueOrThrow({ where: { id: turno.id } });
    expect([row.status, row.cancelledBy, row.cancellationCause, row.cancellationReason]).toEqual([
      'CANCELLED',
      BookingActor.EMPLOYEE,
      'PUBLIC_HOLIDAY',
      'Ana no atiende por Año Nuevo.',
    ]);
    expect(row.cancelledAt?.getTime()).toBe(now.getTime());
  });

  it('keeps the settings as they were when a cancellation fails', async () => {
    await repository.save(userId, { countryCode: 'AR', disabledIds: [] });
    const turno = await book(26);
    // A Causa the database does not know makes the cancellation throw after the settings were written.
    const unknown = { ...order(turno.id), cause: 'UNKNOWN' as CancellationCause };

    await expect(
      repository.saveCancelling(userId, { countryCode: 'BR', disabledIds: ['x'] }, [unknown], now),
    ).rejects.toThrow();

    expect(await repository.findByUserId(userId)).toEqual({
      countryCode: 'AR',
      disabledIds: [],
    });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: turno.id } })).status).toBe('BOOKED');
  });
});
