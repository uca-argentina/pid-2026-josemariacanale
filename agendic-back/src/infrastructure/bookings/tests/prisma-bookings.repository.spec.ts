import { BookingStatus } from '../../../domain/bookings/booking';
import {
  BusinessRuleError,
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../../domain/errors';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaBookingsRepository } from '../prisma-bookings.repository';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

const BOOKING_ROW = {
  id: 1,
  serviceId: 1,
  employeeId: 1,
  client: { name: 'Bruno Díaz', email: 'bruno@example.com' },
  prepStartsAt: new Date('2026-01-01T11:45:00.000Z'),
  startsAt: new Date('2026-01-01T12:00:00.000Z'),
  endsAt: new Date('2026-01-01T12:30:00.000Z'),
  status: BookingStatus.UNVERIFIED,
  verificationTokenHash: 'hash',
  verificationTokenExpiresAt: new Date('2026-01-02T12:00:00.000Z'),
  createdAt: new Date('2026-01-01T12:00:00.000Z'),
  notes: null,
  noShowAt: null,
};

describe('PrismaBookingsRepository', () => {
  const tx = {
    $executeRaw: jest.fn(),
    booking: { count: jest.fn(), update: jest.fn() },
  };
  const prisma = {
    booking: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
    },
    $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
  };
  const repository = new PrismaBookingsRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((run) => run(tx));
  });

  it('translates the overlap exclusion violation into ConflictError on markVerified', async () => {
    const cause = knownError('P2039');
    cause.meta = { driverAdapterError: { cause: { originalCode: '23P01' } } };
    prisma.booking.update.mockRejectedValue(cause);

    const error = await repository.markVerified(1, BookingStatus.BOOKED).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toHaveProperty('cause', cause);
  });

  it('recognises the violation by the constraint name when the driver meta is absent', async () => {
    const cause = knownError('P2039');
    cause.message = 'exclusion constraint "Booking_no_overlap" violated';
    prisma.booking.update.mockRejectedValue(cause);

    const error = await repository.markVerified(1, BookingStatus.BOOKED).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictError);
  });

  it('finds a Booking by its verification token hash and returns it', async () => {
    prisma.booking.findFirst.mockResolvedValue(BOOKING_ROW);

    const booking = await repository.findByVerificationToken(
      'a-token',
      new Date('2026-01-01T12:00:00.000Z'),
    );

    expect(booking).toEqual({
      id: BOOKING_ROW.id,
      serviceId: BOOKING_ROW.serviceId,
      employeeId: BOOKING_ROW.employeeId,
      clientName: BOOKING_ROW.client.name,
      clientEmail: BOOKING_ROW.client.email,
      prepStartsAt: BOOKING_ROW.prepStartsAt,
      startsAt: BOOKING_ROW.startsAt,
      endsAt: BOOKING_ROW.endsAt,
      status: BOOKING_ROW.status,
      notes: null,
      noShowAt: null,
    });
  });

  it.each([
    ['an unknown token', null],
    ['an expired token', { ...BOOKING_ROW, verificationTokenExpiresAt: new Date('2026-01-01T11:00:00.000Z') }],
    ['a used token', { ...BOOKING_ROW, verificationTokenExpiresAt: null }],
  ])('throws BusinessRuleError for %s', async (_, row) => {
    prisma.booking.findFirst.mockResolvedValue(row);

    await expect(
      repository.findByVerificationToken(
        'a-token',
        new Date('2026-01-01T12:00:00.000Z'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('maps each Empleado to when they last received a PENDING or BOOKED Turno of the Servicio', async () => {
    prisma.booking.groupBy.mockResolvedValue([
      { employeeId: 1, _max: { createdAt: new Date('2026-01-01T10:00:00.000Z') } },
    ]);

    const last = await repository.lastReceivedByEmployee(4, [1, 2]);

    expect(last).toEqual(new Map([[1, new Date('2026-01-01T10:00:00.000Z')]]));
    expect(prisma.booking.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          serviceId: 4,
          employeeId: { in: [1, 2] },
          status: { in: [BookingStatus.PENDING, BookingStatus.BOOKED] },
        },
      }),
    );
  });

  it('lists the occupied range of each Turno of the Empleado, from its preparation', async () => {
    prisma.booking.findMany.mockResolvedValue([]);
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-01-02T00:00:00.000Z');

    await repository.listOccupiedByUser(1, from, to);

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        userId: 1,
        status: { in: [BookingStatus.PENDING, BookingStatus.BOOKED] },
        prepStartsAt: { lt: to },
        endsAt: { gt: from },
      },
      select: { prepStartsAt: true, endsAt: true },
    });
  });

  describe('Límite diario', () => {
    const FROM = new Date('2026-01-01T03:00:00.000Z');
    const TO = new Date('2026-01-02T03:00:00.000Z');
    const OCCUPYING = { in: [BookingStatus.PENDING, BookingStatus.BOOKED] };

    it('lists when the PENDING and BOOKED Turnos of the Servicio start, of every Empleado: not UNVERIFIED, CANCELLED or REJECTED', async () => {
      prisma.booking.findMany.mockResolvedValue([
        { startsAt: new Date('2026-01-01T13:00:00.000Z') },
      ]);

      await expect(
        repository.listOccupiedStartsByService(1, FROM, TO, 9),
      ).resolves.toEqual([new Date('2026-01-01T13:00:00.000Z')]);
      expect(prisma.booking.findMany).toHaveBeenCalledWith({
        where: {
          id: { not: 9 },
          serviceId: 1,
          status: OCCUPYING,
          startsAt: { gte: FROM, lt: TO },
        },
        select: { startsAt: true },
      });
    });

    it('verifies under the limit inside a transaction locked per Servicio', async () => {
      tx.booking.count.mockResolvedValue(1);
      tx.booking.update.mockResolvedValue({ ...BOOKING_ROW, status: BookingStatus.BOOKED });

      await repository.markVerified(1, BookingStatus.BOOKED, {
        serviceId: 4,
        limit: 2,
        from: FROM,
        to: TO,
      });

      expect(tx.$executeRaw).toHaveBeenCalled();
      expect(tx.booking.count).toHaveBeenCalledWith({
        where: { serviceId: 4, status: OCCUPYING, startsAt: { gte: FROM, lt: TO } },
      });
      expect(tx.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: BookingStatus.BOOKED }),
        }),
      );
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('throws ConflictError and verifies nothing once the limit is reached', async () => {
      tx.booking.count.mockResolvedValue(2);

      await expect(
        repository.markVerified(1, BookingStatus.BOOKED, {
          serviceId: 4,
          limit: 2,
          from: FROM,
          to: TO,
        }),
      ).rejects.toThrow(
        new ConflictError('The Service reached its Límite diario that day'),
      );
      expect(tx.booking.update).not.toHaveBeenCalled();
    });

    it('still translates the overlap exclusion violation into ConflictError', async () => {
      const cause = knownError('P2039');
      cause.meta = { driverAdapterError: { cause: { originalCode: '23P01' } } };
      tx.booking.count.mockResolvedValue(0);
      tx.booking.update.mockRejectedValue(cause);

      const error = await repository
        .markVerified(1, BookingStatus.BOOKED, { serviceId: 4, limit: 2, from: FROM, to: TO })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toHaveProperty('message', 'Overlaps a booked Turno for this Employee');
    });
  });

  describe('PENDING Turnos hold their horario', () => {
    const OCCUPYING = { in: [BookingStatus.PENDING, BookingStatus.BOOKED] };

    it('listOccupiedByUser looks at PENDING and BOOKED', async () => {
      prisma.booking.findMany.mockResolvedValue([]);

      await repository.listOccupiedByUser(1, new Date(), new Date());

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: OCCUPYING }),
        }),
      );
    });

    it('markVerified stores the given status', async () => {
      prisma.booking.update.mockResolvedValue({
        ...BOOKING_ROW,
        status: BookingStatus.PENDING,
      });

      await repository.markVerified(1, BookingStatus.PENDING);

      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: BookingStatus.PENDING }),
        }),
      );
    });
  });

  describe('resolvePending', () => {
    it('only touches a Turno that is still PENDING', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 1 });
      prisma.booking.findUnique.mockResolvedValue({
        ...BOOKING_ROW,
        status: BookingStatus.REJECTED,
      });

      const booking = await repository.resolvePending(1, BookingStatus.REJECTED);

      expect(prisma.booking.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: BookingStatus.PENDING },
        data: { status: BookingStatus.REJECTED },
      });
      expect(booking.status).toBe(BookingStatus.REJECTED);
    });

    it('throws BusinessRuleError when it is no longer PENDING', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        repository.resolvePending(1, BookingStatus.BOOKED),
      ).rejects.toBeInstanceOf(BusinessRuleError);
    });
  });

  describe('translates other Prisma errors, keeping the original as cause', () => {
    it('P2025 on markVerified into NotFoundError', async () => {
      const cause = knownError('P2025');
      prisma.booking.update.mockRejectedValue(cause);

      const error = await repository.markVerified(1, BookingStatus.BOOKED).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toHaveProperty('cause', cause);
    });

    it('anything else into DatabaseOperationError', async () => {
      const cause = new Error('connection refused at 10.0.0.1');
      prisma.booking.update.mockRejectedValue(cause);

      const error = await repository.markVerified(1, BookingStatus.BOOKED).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(DatabaseOperationError);
      expect(error).toHaveProperty('cause', cause);
    });
  });

  describe('acting on BOOKED Turnos', () => {
    const NOW = new Date('2026-01-02T12:00:00.000Z');

    beforeEach(() => prisma.booking.findUnique.mockResolvedValue(BOOKING_ROW));

    it('cancel only touches a BOOKED Turno', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 1 });

      await repository.cancel(1);

      expect(prisma.booking.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: BookingStatus.BOOKED },
        data: { status: BookingStatus.CANCELLED },
      });
    });

    it('answers BusinessRuleError when the Turno stopped being BOOKED', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 0 });

      await expect(repository.cancel(1)).rejects.toBeInstanceOf(BusinessRuleError);
      await expect(
        repository.reschedule(1, { employeeId: 1, userId: 1, prepStartsAt: NOW, startsAt: NOW, endsAt: NOW }),
      ).rejects.toBeInstanceOf(BusinessRuleError);
    });

    it('translates the overlap exclusion violation into ConflictError on reschedule', async () => {
      const cause = knownError('P2039');
      cause.meta = { driverAdapterError: { cause: { originalCode: '23P01' } } };
      prisma.booking.updateMany.mockRejectedValue(cause);

      await expect(
        repository.reschedule(1, { employeeId: 1, userId: 1, prepStartsAt: NOW, startsAt: NOW, endsAt: NOW }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it('markNoShow requires an ended Turno without an Ausencia', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 1 });

      await repository.markNoShow(1, NOW);

      expect(prisma.booking.updateMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: BookingStatus.BOOKED,
          endsAt: { lte: NOW },
          noShowAt: null,
        },
        data: { noShowAt: NOW },
      });
    });

    it('excludes the given Turno from the occupied horarios', async () => {
      prisma.booking.findMany.mockResolvedValue([]);

      await repository.listOccupiedByUser(1, NOW, NOW, 9);

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { not: 9 } }),
        }),
      );
    });
  });
});
