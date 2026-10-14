import 'dotenv/config';
import {
  BookingActor,
  BookingStatus,
  CancellationCause,
} from '../../../domain/bookings/booking';
import { ConflictError } from '../../../domain/errors';
import { OutOfOfficeReason } from '../../../domain/out-of-office/out-of-office';
import { PrismaBookingsRepository } from '../../bookings/prisma-bookings.repository';
import { PrismaService } from '../../prisma.service';
import { PrismaOutOfOfficeRepository } from '../prisma-out-of-office.repository';

/** Runs against the real database: the período and the cancellations are one transaction (ADR 0034). */
describe('PrismaOutOfOfficeRepository.createCancelling (real database)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaOutOfOfficeRepository(prisma);
  const bookings = new PrismaBookingsRepository(prisma);
  const tag = `ooo-cancelling-${Date.now()}`;
  const now = new Date(Date.UTC(2031, 0, 10, 12));
  let userId: number;
  let serviceId: number;

  const period = (startDate: string, endDate: string) => ({
    startDate,
    endDate,
    reason: OutOfOfficeReason.VACATION,
    notes: null,
    showNotePublicly: false,
  });

  const book = (day: number, hour = 10) =>
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

  const order = (id: number, reason = 'Vacaciones.') => ({
    id,
    cause: CancellationCause.OUT_OF_OFFICE,
    reason,
  });

  beforeAll(async () => {
    userId = (
      await prisma.user.create({
        data: { clerkId: tag, name: tag, email: `${tag}@example.com` },
      })
    ).id;
    const { id: availabilityId } = await prisma.availability.create({
      data: { userId, name: 'BA', timeZone: 'UTC', isDefault: true },
    });
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
      await prisma.outOfOffice.deleteMany({ where: { userId } });
      await prisma.service.deleteMany({ where: { userId } });
      await prisma.availability.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('creates the período and cancels the Turnos with the Motivo and the Causa, grouped by text', async () => {
    const first = await book(15);
    const second = await book(16);
    const third = await book(17);

    const { outOfOffice, cancelledIds } = await repository.createCancelling(
      userId,
      period('2031-01-14', '2031-01-17'),
      [order(first.id), order(second.id), order(third.id, 'Otro texto.')],
      now,
    );

    expect(outOfOffice).toMatchObject({ userId, startDate: '2031-01-14' });
    expect(cancelledIds).toHaveLength(3);
    expect(cancelledIds).toEqual(expect.arrayContaining([first.id, second.id, third.id]));
    const rows = await prisma.booking.findMany({
      where: { id: { in: [first.id, second.id, third.id] } },
      orderBy: { id: 'asc' },
    });
    expect(rows.map((r) => [r.status, r.cancelledBy, r.cancellationCause, r.cancellationReason])).toEqual([
      ['CANCELLED', BookingActor.EMPLOYEE, 'OUT_OF_OFFICE', 'Vacaciones.'],
      ['CANCELLED', BookingActor.EMPLOYEE, 'OUT_OF_OFFICE', 'Vacaciones.'],
      ['CANCELLED', BookingActor.EMPLOYEE, 'OUT_OF_OFFICE', 'Otro texto.'],
    ]);
    expect(rows.every((r) => r.cancelledAt?.getTime() === now.getTime() && r.rescheduled === null)).toBe(true);
  });

  it('leaves alone a Turno already cancelled and one that already started, and reports only the ones it cancelled', async () => {
    const open = await book(20);
    const alreadyCancelled = await book(21);
    await bookings.cancel(alreadyCancelled.id, new Date(Date.UTC(2031, 0, 5)), 'Antes');
    // Starts before `now`.
    const started = await book(9);

    const { cancelledIds } = await repository.createCancelling(
      userId,
      period('2031-01-20', '2031-01-21'),
      [order(open.id), order(alreadyCancelled.id), order(started.id)],
      now,
    );

    expect(cancelledIds).toEqual([open.id]);
    const untouched = await prisma.booking.findMany({
      where: { id: { in: [alreadyCancelled.id, started.id] } },
      orderBy: { id: 'asc' },
    });
    expect(untouched.map((r) => [r.status, r.cancellationCause, r.cancellationReason])).toEqual([
      ['CANCELLED', null, 'Antes'],
      ['BOOKED', null, null],
    ]);
  });

  it('keeps nothing when the período cannot be created: the Turnos stay as they were', async () => {
    await repository.create(userId, period('2031-02-01', '2031-02-03'));
    const turno = await book(25);

    await expect(
      repository.createCancelling(userId, period('2031-02-01', '2031-02-03'), [order(turno.id)], now),
    ).rejects.toThrow(ConflictError);

    const row = await prisma.booking.findUniqueOrThrow({ where: { id: turno.id } });
    expect(row.status).toBe('BOOKED');
    expect(row.cancellationCause).toBeNull();
  });

  it('keeps no período when a cancellation fails', async () => {
    const turno = await book(26);
    // A Causa the database does not know makes the cancellation throw after the período was inserted.
    const unknown = { ...order(turno.id), cause: 'UNKNOWN' as CancellationCause };
    await expect(
      repository.createCancelling(userId, period('2031-03-01', '2031-03-02'), [unknown], now),
    ).rejects.toThrow();

    expect(await repository.findByUserAndDates(userId, '2031-03-01', '2031-03-02')).toBeNull();
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: turno.id } })).status).toBe('BOOKED');
  });

  describe('updateCancelling', () => {
    it('replaces the período and cancels the Turnos in one transaction', async () => {
      const saved = await repository.create(userId, period('2031-01-12', '2031-01-14'));
      const turno = await book(15);

      const { outOfOffice, cancelledIds } = await repository.updateCancelling(
        saved.id,
        period('2031-01-12', '2031-01-16'),
        [order(turno.id)],
        now,
      );

      expect(outOfOffice).toMatchObject({ id: saved.id, endDate: '2031-01-16' });
      expect(cancelledIds).toEqual([turno.id]);
      expect((await repository.findById(saved.id))?.endDate).toBe('2031-01-16');
      const row = await prisma.booking.findUniqueOrThrow({ where: { id: turno.id } });
      expect([row.status, row.cancellationCause]).toEqual(['CANCELLED', 'OUT_OF_OFFICE']);
    });

    it('keeps the período as it was when a cancellation fails', async () => {
      const saved = await repository.create(userId, period('2031-05-01', '2031-05-05'));
      const turno = await book(27);
      const unknown = { ...order(turno.id), cause: 'UNKNOWN' as CancellationCause };

      await expect(
        repository.updateCancelling(saved.id, period('2031-05-01', '2031-05-09'), [unknown], now),
      ).rejects.toThrow();

      expect((await repository.findById(saved.id))?.endDate).toBe('2031-05-05');
      expect((await prisma.booking.findUniqueOrThrow({ where: { id: turno.id } })).status).toBe('BOOKED');
    });

    it('cancels nothing when the new dates collide with another período', async () => {
      await repository.create(userId, period('2031-06-10', '2031-06-12'));
      const saved = await repository.create(userId, period('2031-06-01', '2031-06-05'));
      const turno = await book(28);

      await expect(
        repository.updateCancelling(saved.id, period('2031-06-10', '2031-06-12'), [order(turno.id)], now),
      ).rejects.toThrow(ConflictError);

      expect((await prisma.booking.findUniqueOrThrow({ where: { id: turno.id } })).status).toBe('BOOKED');
    });
  });
});
