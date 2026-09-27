import { BusinessRuleError, ConflictError } from '../../../domain/errors';
import { BookingStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaAvailabilityOverridesRepository } from '../prisma-availability-overrides.repository';

/** How Prisma reads a Postgres time(0)/date. */
const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const date = (yyyymmdd: string) => new Date(`${yyyymmdd}T00:00:00.000Z`);

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

describe('PrismaAvailabilityOverridesRepository', () => {
  const tx = {
    availabilityOverride: { deleteMany: jest.fn(), createMany: jest.fn() },
    booking: { findMany: jest.fn(), updateMany: jest.fn() },
  };
  const prisma = {
    availabilityOverride: { findMany: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
  };
  const repository = new PrismaAvailabilityOverridesRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((run) => run(tx));
    tx.booking.findMany.mockResolvedValue([]);
  });

  it("reads an Empleado's Anulaciones, grouped by date and with times as HH:mm", async () => {
    prisma.availabilityOverride.findMany.mockResolvedValue([
      {
        employeeId: 7,
        date: date('2026-02-11'),
        startTime: time('09:00'),
        endTime: time('13:00'),
        coveredByEmployeeId: null,
      },
      {
        employeeId: 7,
        date: date('2026-02-11'),
        startTime: time('14:00'),
        endTime: time('18:00'),
        coveredByEmployeeId: null,
      },
      {
        employeeId: 7,
        date: date('2026-02-12'),
        startTime: null,
        endTime: null,
        coveredByEmployeeId: 9,
      },
    ]);

    await expect(repository.listByEmployee(7)).resolves.toEqual([
      {
        employeeId: 7,
        date: '2026-02-11',
        intervals: [
          { startTime: '09:00', endTime: '13:00' },
          { startTime: '14:00', endTime: '18:00' },
        ],
        coveredByEmployeeId: null,
      },
      {
        employeeId: 7,
        date: '2026-02-12',
        intervals: [],
        coveredByEmployeeId: 9,
      },
    ]);
    expect(prisma.availabilityOverride.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: 7 } }),
    );
  });

  describe('replace', () => {
    it('deletes the date old rows before writing the new Franjas, in one transaction', async () => {
      const intervals = [{ startTime: '09:00', endTime: '13:00' }];

      await repository.replace(7, '2026-02-11', intervals, null);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.availabilityOverride.deleteMany).toHaveBeenCalledWith({
        where: { employeeId: 7, date: date('2026-02-11') },
      });
      expect(tx.availabilityOverride.createMany).toHaveBeenCalledWith({
        data: [
          {
            employeeId: 7,
            date: date('2026-02-11'),
            startTime: time('09:00'),
            endTime: time('13:00'),
            coveredByEmployeeId: null,
          },
        ],
      });
      expect(
        tx.availabilityOverride.deleteMany.mock.invocationCallOrder[0],
      ).toBeLessThan(
        tx.availabilityOverride.createMany.mock.invocationCallOrder[0],
      );
    });

    it('writes a single nulled row for a día libre', async () => {
      await repository.replace(7, '2026-02-11', [], null);

      expect(tx.availabilityOverride.createMany).toHaveBeenCalledWith({
        data: [
          {
            employeeId: 7,
            date: date('2026-02-11'),
            coveredByEmployeeId: null,
          },
        ],
      });
      expect(tx.booking.updateMany).not.toHaveBeenCalled();
    });

    it('reassigns that date BOOKED Turnos to the cubridor when coveredByEmployeeId is given', async () => {
      tx.booking.findMany.mockResolvedValue([
        {
          id: 101,
          startsAt: new Date('2026-02-11T12:00:00.000Z'),
          service: { branch: { timeZone: 'America/Argentina/Buenos_Aires' } },
        },
      ]);

      await repository.replace(7, '2026-02-11', [], 9);

      expect(tx.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employeeId: 7,
            status: { in: [BookingStatus.BOOKED, BookingStatus.CONFIRMADO] },
          }),
        }),
      );
      expect(tx.booking.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [101] } },
        data: { employeeId: 9 },
      });
    });

    it("goes by the Turno's own Sucursal's local date, not UTC, near midnight", async () => {
      tx.booking.findMany.mockResolvedValue([
        // 2026-02-11 21:00 UTC is already 2026-02-11 18:00 in Buenos Aires (UTC-3): same local date.
        {
          id: 1,
          startsAt: new Date('2026-02-11T21:00:00.000Z'),
          service: { branch: { timeZone: 'America/Argentina/Buenos_Aires' } },
        },
        // 2026-02-12 01:00 UTC is 2026-02-11 22:00 in Buenos Aires: still the 11th locally, past the UTC boundary.
        {
          id: 2,
          startsAt: new Date('2026-02-12T01:00:00.000Z'),
          service: { branch: { timeZone: 'America/Argentina/Buenos_Aires' } },
        },
        // A Turno of a Sucursal on another date entirely, still inside the wide UTC candidate window.
        {
          id: 3,
          startsAt: new Date('2026-02-12T10:00:00.000Z'),
          service: { branch: { timeZone: 'America/Argentina/Buenos_Aires' } },
        },
      ]);

      await repository.replace(7, '2026-02-11', [], 9);

      expect(tx.booking.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { employeeId: 9 },
      });
    });

    it('does not touch Turnos without a cubridor', async () => {
      await repository.replace(7, '2026-02-11', [], null);

      expect(tx.booking.findMany).not.toHaveBeenCalled();
      expect(tx.booking.updateMany).not.toHaveBeenCalled();
    });

    it('reassigns nothing, without calling updateMany, when no candidate matches the local date', async () => {
      tx.booking.findMany.mockResolvedValue([
        {
          id: 1,
          startsAt: new Date('2026-02-12T10:00:00.000Z'),
          service: { branch: { timeZone: 'America/Argentina/Buenos_Aires' } },
        },
      ]);

      await repository.replace(7, '2026-02-11', [], 9);

      expect(tx.booking.updateMany).not.toHaveBeenCalled();
    });

    it('translates a colliding Turno of the cubridor into ConflictError, saving nothing', async () => {
      const cause = knownError('P2039');
      cause.meta = { driverAdapterError: { cause: { originalCode: '23P01' } } };
      tx.booking.findMany.mockResolvedValue([
        {
          id: 101,
          startsAt: new Date('2026-02-11T12:00:00.000Z'),
          service: { branch: { timeZone: 'UTC' } },
        },
      ]);
      tx.booking.updateMany.mockRejectedValue(cause);

      const error = await repository
        .replace(7, '2026-02-11', [], 9)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toHaveProperty('cause', cause);
    });

    it('translates a race on the Franjas exclusion constraint into the same 422 the use case gives', async () => {
      const cause = knownError('P2039');
      cause.message =
        'exclusion constraint "AvailabilityOverride_no_overlap" violated';
      tx.availabilityOverride.createMany.mockRejectedValue(cause);

      const error = await repository
        .replace(
          7,
          '2026-02-11',
          [{ startTime: '09:00', endTime: '13:00' }],
          null,
        )
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BusinessRuleError);
      expect(error).toHaveProperty(
        'message',
        'Dos Franjas del mismo día se solapan',
      );
    });
  });

  it('deletes the date Anulaciones', async () => {
    prisma.availabilityOverride.deleteMany.mockResolvedValue({ count: 1 });

    await repository.delete(7, '2026-02-11');

    expect(prisma.availabilityOverride.deleteMany).toHaveBeenCalledWith({
      where: { employeeId: 7, date: date('2026-02-11') },
    });
  });
});
