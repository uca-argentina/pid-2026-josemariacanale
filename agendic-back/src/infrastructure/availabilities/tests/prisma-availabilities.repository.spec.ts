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
  WITH_SCHEDULE,
} from '../prisma-availabilities.repository';

/** Monday to Friday 09:00–17:00, Wednesday 10:00–14:00; a día libre on Jan 5 and a shorter day on Jan 6. */
const AVAILABILITY: Availability = {
  id: 1,
  userId: 7,
  name: 'Horas laborables',
  timeZone: 'America/Argentina/Buenos_Aires',
  isDefault: true,
  schedule: [
    [],
    [{ start: '09:00', end: '17:00' }],
    [{ start: '09:00', end: '17:00' }],
    [{ start: '10:00', end: '14:00' }],
    [{ start: '09:00', end: '17:00' }],
    [{ start: '09:00', end: '17:00' }],
    [],
  ],
  overrides: [
    { date: '2026-01-05', ranges: [] },
    {
      date: '2026-01-06',
      ranges: [
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '16:00' },
      ],
    },
  ],
};

/** How Prisma reads a Postgres time(0): 1970-01-01T<HH:mm>Z. */
const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const date = (day: string) => new Date(`${day}T00:00:00.000Z`);

/** Grouped as the API stores it: ranges with the same hours share a Franja. */
const INTERVAL_ROWS = [
  { days: [1, 2, 4, 5], startTime: time('09:00'), endTime: time('17:00') },
  { days: [3], startTime: time('10:00'), endTime: time('14:00') },
];

const OVERRIDE_ROWS = [
  { date: date('2026-01-05'), startTime: null, endTime: null },
  { date: date('2026-01-06'), startTime: time('09:00'), endTime: time('12:00') },
  { date: date('2026-01-06'), startTime: time('14:00'), endTime: time('16:00') },
];

const AVAILABILITY_ROW = {
  id: AVAILABILITY.id,
  userId: AVAILABILITY.userId,
  name: AVAILABILITY.name,
  timeZone: AVAILABILITY.timeZone,
  isDefault: AVAILABILITY.isDefault,
  intervals: INTERVAL_ROWS.map((row, i) => ({
    id: 100 + i,
    availabilityId: AVAILABILITY.id,
    ...row,
  })),
  overrides: OVERRIDE_ROWS.map((row, i) => ({
    id: 200 + i,
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
    availabilityOverride: { deleteMany: jest.fn() },
  };
  const prisma = {
    availability: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    employeeService: { count: jest.fn() },
    $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
  };
  const repository = new PrismaAvailabilitiesRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((run) => run(tx));
  });

  it('reads the grouped Franjas back as the 7-day matrix, and the Anulaciones by date', async () => {
    prisma.availability.findUnique.mockResolvedValue(AVAILABILITY_ROW);

    await expect(repository.findById(1)).resolves.toEqual(AVAILABILITY);
    expect(prisma.availability.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: WITH_SCHEDULE,
    });
  });

  it('returns null when the Availability does not exist', async () => {
    prisma.availability.findUnique.mockResolvedValue(null);

    await expect(repository.findById(999)).resolves.toBeNull();
  });

  it("lists a Usuario's Availabilities without their Franjas", async () => {
    const summary = {
      id: 1,
      userId: 7,
      name: AVAILABILITY.name,
      timeZone: AVAILABILITY.timeZone,
      isDefault: true,
    };
    prisma.availability.findMany.mockResolvedValue([summary]);

    await expect(repository.listByUser(7)).resolves.toEqual([summary]);
    expect(prisma.availability.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 7 } }),
    );
  });

  it('creates an empty Availability that is not the default', async () => {
    prisma.availability.create.mockResolvedValue({
      ...AVAILABILITY_ROW,
      isDefault: false,
      intervals: [],
      overrides: [],
    });

    const created = await repository.create({
      userId: 7,
      name: AVAILABILITY.name,
      timeZone: AVAILABILITY.timeZone,
    });

    expect(created.schedule).toEqual([[], [], [], [], [], [], []]);
    expect(prisma.availability.create).toHaveBeenCalledWith({
      data: {
        userId: 7,
        name: AVAILABILITY.name,
        timeZone: AVAILABILITY.timeZone,
        isDefault: false,
      },
      include: WITH_SCHEDULE,
    });
  });

  describe('replace', () => {
    it('groups the days with equal hours into one Franja, and writes a día libre as a row without hours', async () => {
      tx.availability.update.mockResolvedValue(AVAILABILITY_ROW);

      await repository.replace(1, AVAILABILITY);

      expect(tx.availability.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: AVAILABILITY.name,
          timeZone: AVAILABILITY.timeZone,
          intervals: { create: INTERVAL_ROWS },
          overrides: {
            create: [
              { date: date('2026-01-05') },
              {
                date: date('2026-01-06'),
                startTime: time('09:00'),
                endTime: time('12:00'),
              },
              {
                date: date('2026-01-06'),
                startTime: time('14:00'),
                endTime: time('16:00'),
              },
            ],
          },
        },
        include: WITH_SCHEDULE,
      });
    });

    it('deletes the old Franjas and Anulaciones first, in one transaction', async () => {
      tx.availability.update.mockResolvedValue(AVAILABILITY_ROW);

      await expect(repository.replace(1, AVAILABILITY)).resolves.toEqual(
        AVAILABILITY,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.availabilityInterval.deleteMany).toHaveBeenCalledWith({
        where: { availabilityId: 1 },
      });
      expect(tx.availabilityOverride.deleteMany).toHaveBeenCalledWith({
        where: { availabilityId: 1 },
      });
      const update = tx.availability.update.mock.invocationCallOrder[0];
      expect(
        tx.availabilityInterval.deleteMany.mock.invocationCallOrder[0],
      ).toBeLessThan(update);
      expect(
        tx.availabilityOverride.deleteMany.mock.invocationCallOrder[0],
      ).toBeLessThan(update);
    });
  });

  it("unmarks the Usuario's other default before marking this one, in one transaction", async () => {
    tx.availability.findUniqueOrThrow.mockResolvedValue({ userId: 7 });
    tx.availability.update.mockResolvedValue(AVAILABILITY_ROW);

    await expect(repository.makeDefault(1)).resolves.toEqual(AVAILABILITY);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.availability.updateMany).toHaveBeenCalledWith({
      where: { userId: 7, isDefault: true, id: { not: 1 } },
      data: { isDefault: false },
    });
    expect(tx.availability.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isDefault: true },
      include: WITH_SCHEDULE,
    });
    expect(tx.availability.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.availability.update.mock.invocationCallOrder[0],
    );
  });

  it('counts the Services that use it', async () => {
    prisma.employeeService.count.mockResolvedValue(2);

    await expect(repository.countServices(1)).resolves.toBe(2);
    expect(prisma.employeeService.count).toHaveBeenCalledWith({
      where: { availabilityId: 1 },
    });
  });

  it('deletes the Availability, its Franjas and Anulaciones going with it by cascade', async () => {
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
      tx.availability.findUniqueOrThrow.mockResolvedValue({ userId: 7 });

      const error = await repository.makeDefault(1).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toHaveProperty('cause', cause);
    });

    it('translates a violation of the Anulaciones exclusion constraint into BusinessRuleError', async () => {
      const cause = knownError('P2039');
      // Postgres 23P01 arrives as the generic P2039, per ADR 0004.
      cause.meta = { driverAdapterError: { cause: { originalCode: '23P01' } } };
      tx.availability.update.mockRejectedValue(cause);

      const error = await repository
        .replace(1, AVAILABILITY)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BusinessRuleError);
      expect(error).toHaveProperty('cause', cause);
    });

    it('translates the foreign key of a Service still using it into ConflictError, when a link races the delete', async () => {
      const cause = knownError('P2003');
      prisma.availability.delete.mockRejectedValue(cause);

      const error = await repository.delete(1).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toHaveProperty('cause', cause);
    });

    it('does not read a foreign key failing on create (an unknown Usuario) as a Service using it', async () => {
      const cause = knownError('P2003');
      prisma.availability.create.mockRejectedValue(cause);

      const error = await repository
        .create({ userId: 999, name: 'x', timeZone: 'UTC' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(DatabaseOperationError);
    });

    it.each([
      ['replace', () => repository.replace(999, AVAILABILITY)],
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

      const error = await repository.listByUser(7).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(DatabaseOperationError);
      expect(error).toHaveProperty('cause', cause);
      expect((error as Error).message).not.toContain(cause.message);
    });
  });
});
