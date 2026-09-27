import { Availability } from '../../../domain/availabilities/availability';
import {
  BusinessRuleError,
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../../domain/errors';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import {
  PrismaAvailabilitiesRepository,
  WITH_INTERVALS,
} from '../prisma-availabilities.repository';

const AVAILABILITY: Availability = {
  id: 1,
  employeeId: 7,
  name: 'Horario general',
  isDefault: true,
  intervals: [
    { weekday: 1, startTime: '09:00', endTime: '13:00' },
    { weekday: 1, startTime: '14:30', endTime: '18:00' },
  ],
};

/** How Prisma reads a Postgres time(0): 1970-01-01T<HH:mm>Z. */
const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

const INTERVAL_ROWS = [
  { weekday: 1, startTime: time('09:00'), endTime: time('13:00') },
  { weekday: 1, startTime: time('14:30'), endTime: time('18:00') },
];

const AVAILABILITY_ROW = {
  id: AVAILABILITY.id,
  employeeId: AVAILABILITY.employeeId,
  name: AVAILABILITY.name,
  isDefault: AVAILABILITY.isDefault,
  intervals: INTERVAL_ROWS.map((row, i) => ({
    id: 100 + i,
    availabilityId: AVAILABILITY.id,
    ...row,
  })),
};

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

describe('PrismaAvailabilitiesRepository', () => {
  const tx = {
    availability: {
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    availabilityInterval: { deleteMany: jest.fn() },
  };
  const prisma = {
    availability: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
  };
  const repository = new PrismaAvailabilitiesRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((run) => run(tx));
  });

  it('writes the Franjas hours as times, and reads them back as HH:mm', async () => {
    prisma.availability.create.mockResolvedValue(AVAILABILITY_ROW);
    const { id: _, ...data } = AVAILABILITY;

    await expect(repository.create(data)).resolves.toEqual(AVAILABILITY);
    expect(prisma.availability.create).toHaveBeenCalledWith({
      data: {
        employeeId: AVAILABILITY.employeeId,
        name: AVAILABILITY.name,
        isDefault: true,
        intervals: { create: INTERVAL_ROWS },
      },
      include: WITH_INTERVALS,
    });
  });

  it('reads the Franjas ordered by weekday and start time', async () => {
    prisma.availability.findUnique.mockResolvedValue(AVAILABILITY_ROW);

    await expect(repository.findById(1)).resolves.toEqual(AVAILABILITY);
    expect(prisma.availability.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        intervals: { orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] },
      },
    });
  });

  it('returns null when the Availability does not exist', async () => {
    prisma.availability.findUnique.mockResolvedValue(null);

    await expect(repository.findById(999)).resolves.toBeNull();
  });

  it("lists an Empleado's Availabilities", async () => {
    prisma.availability.findMany.mockResolvedValue([AVAILABILITY_ROW]);

    await expect(repository.listByEmployee(7)).resolves.toEqual([
      AVAILABILITY,
    ]);
    expect(prisma.availability.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: 7 } }),
    );
  });

  describe('update', () => {
    it('replaces the whole set of Franjas, deleting the old ones first, in one transaction', async () => {
      tx.availability.update.mockResolvedValue(AVAILABILITY_ROW);

      await repository.update(1, { intervals: AVAILABILITY.intervals });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.availabilityInterval.deleteMany).toHaveBeenCalledWith({
        where: { availabilityId: 1 },
      });
      expect(tx.availability.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: undefined, intervals: { create: INTERVAL_ROWS } },
        include: WITH_INTERVALS,
      });
      expect(
        tx.availabilityInterval.deleteMany.mock.invocationCallOrder[0],
      ).toBeLessThan(tx.availability.update.mock.invocationCallOrder[0]);
    });

    it('renames without touching the Franjas', async () => {
      tx.availability.update.mockResolvedValue(AVAILABILITY_ROW);

      await repository.update(1, { name: 'Otro' });

      expect(tx.availabilityInterval.deleteMany).not.toHaveBeenCalled();
      expect(tx.availability.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Otro', intervals: undefined },
        include: WITH_INTERVALS,
      });
    });
  });

  it("unmarks the Empleado's other default before marking this one, in one transaction", async () => {
    tx.availability.findUniqueOrThrow.mockResolvedValue({ employeeId: 7 });
    tx.availability.update.mockResolvedValue(AVAILABILITY_ROW);

    await expect(repository.makeDefault(1)).resolves.toEqual(AVAILABILITY);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.availability.updateMany).toHaveBeenCalledWith({
      where: { employeeId: 7, isDefault: true, id: { not: 1 } },
      data: { isDefault: false },
    });
    expect(tx.availability.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isDefault: true },
      include: WITH_INTERVALS,
    });
    expect(tx.availability.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.availability.update.mock.invocationCallOrder[0],
    );
  });

  it('deletes the Availability, its Franjas going with it by cascade', async () => {
    prisma.availability.delete.mockResolvedValue(AVAILABILITY_ROW);

    await repository.delete(1);

    expect(prisma.availability.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  describe('translates Prisma errors, keeping the original as cause', () => {
    it('translates a violation of the one-default partial index into ConflictError', async () => {
      const cause = knownError('P2002');
      tx.availability.update.mockRejectedValue(cause);
      tx.availability.findUniqueOrThrow.mockResolvedValue({ employeeId: 7 });

      const error = await repository.makeDefault(1).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toHaveProperty('cause', cause);
    });

    it('translates a violation of the Franjas exclusion constraint into the same 422 the use case gives', async () => {
      const cause = knownError('P2039');
      // Postgres 23P01 arrives as the generic P2039, per ADR 0004.
      cause.meta = { driverAdapterError: { cause: { originalCode: '23P01' } } };
      tx.availability.update.mockRejectedValue(cause);

      const error = await repository
        .update(1, { intervals: AVAILABILITY.intervals })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BusinessRuleError);
      expect(error).toHaveProperty(
        'message',
        'Dos Franjas del mismo día se solapan',
      );
      expect(error).toHaveProperty('cause', cause);
    });

    it('recognises the exclusion violation by the constraint name when the driver meta is absent', async () => {
      const cause = knownError('P2039');
      cause.message =
        'exclusion constraint "AvailabilityInterval_no_overlap" violated';
      prisma.availability.create.mockRejectedValue(cause);
      const { id: _, ...data } = AVAILABILITY;

      const error = await repository.create(data).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BusinessRuleError);
    });

    it.each([
      ['update', () => repository.update(999, { name: 'x' })],
      ['makeDefault', () => repository.makeDefault(999)],
      ['delete', () => repository.delete(999)],
    ])('%s: an unknown Availability into NotFoundError', async (_, call) => {
      const cause = knownError('P2025');
      tx.availability.update.mockRejectedValue(cause);
      tx.availability.findUniqueOrThrow.mockRejectedValue(cause);
      prisma.availability.delete.mockRejectedValue(cause);

      const error = await call().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toHaveProperty('cause', cause);
    });

    it('translates anything else into DatabaseOperationError, without leaking its message', async () => {
      const cause = new Error('connection refused at 10.0.0.1');
      prisma.availability.findMany.mockRejectedValue(cause);

      const error = await repository.listByEmployee(7).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(DatabaseOperationError);
      expect(error).toHaveProperty('cause', cause);
      expect((error as Error).message).not.toContain(cause.message);
    });
  });
});
