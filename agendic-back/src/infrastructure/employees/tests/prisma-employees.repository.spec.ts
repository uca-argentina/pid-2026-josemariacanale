import { Employee } from '../../../domain/employees/employee';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../../domain/errors';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import {
  PrismaEmployeesRepository,
  WITH_USER,
} from '../prisma-employees.repository';

const EMPLOYEE: Employee = {
  id: 1,
  userId: 1,
  businessId: 1,
  name: 'Ana Pérez',
  email: 'ana@example.com',
  retiredAt: null,
};

/** The row shape Prisma returns with the Usuario joined in. */
const EMPLOYEE_ROW = {
  id: EMPLOYEE.id,
  userId: EMPLOYEE.userId,
  businessId: EMPLOYEE.businessId,
  retiredAt: EMPLOYEE.retiredAt,
  user: { name: EMPLOYEE.name, email: EMPLOYEE.email },
};

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

describe('PrismaEmployeesRepository', () => {
  const tx = {
    employee: { update: jest.fn() },
    booking: { updateMany: jest.fn() },
  };
  const prisma = {
    employee: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
  };
  const repository = new PrismaEmployeesRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((run) => run(tx));
  });

  it('lists Employees by id, returning only their domain fields', async () => {
    prisma.employee.findMany.mockResolvedValue([
      { ...EMPLOYEE_ROW, futureColumn: 'x' },
    ]);

    await expect(repository.listByIds([1, 2])).resolves.toEqual([EMPLOYEE]);
    expect(prisma.employee.findMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
      include: WITH_USER,
    });
  });

  it('returns nothing for ids that do not exist, rather than failing', async () => {
    prisma.employee.findMany.mockResolvedValue([]);

    await expect(repository.listByIds([999])).resolves.toEqual([]);
  });

  it('creates an Employee and returns only its domain fields', async () => {
    prisma.employee.create.mockResolvedValue(EMPLOYEE_ROW);
    const data = { userId: 1, businessId: 1 };

    await expect(repository.create(data)).resolves.toEqual(EMPLOYEE);
    expect(prisma.employee.create).toHaveBeenCalledWith({
      data,
      include: WITH_USER,
    });
  });

  it('finds an Employee by id', async () => {
    prisma.employee.findUnique.mockResolvedValue(EMPLOYEE_ROW);

    await expect(repository.findById(1)).resolves.toEqual(EMPLOYEE);
    expect(prisma.employee.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: WITH_USER,
    });
  });

  it('returns null when the Employee does not exist', async () => {
    prisma.employee.findUnique.mockResolvedValue(null);

    await expect(repository.findById(999)).resolves.toBeNull();
  });

  it('lists a Business Employees not dados de baja', async () => {
    prisma.employee.findMany.mockResolvedValue([EMPLOYEE_ROW]);

    await expect(repository.listActiveByBusiness(1)).resolves.toEqual([
      EMPLOYEE,
    ]);
    expect(prisma.employee.findMany).toHaveBeenCalledWith({
      where: { businessId: 1, retiredAt: null },
      include: WITH_USER,
    });
  });

  describe('retire', () => {
    const retiredAt = new Date('2026-02-01T00:00:00.000Z');

    it('sets retiredAt, takes the Employee off every Service, and cancels their future BOOKED Turnos, atomically', async () => {
      tx.employee.update.mockResolvedValue({ ...EMPLOYEE_ROW, retiredAt });
      tx.booking.updateMany.mockResolvedValue({ count: 4 });

      await expect(repository.retire(1, retiredAt)).resolves.toEqual({
        employee: { ...EMPLOYEE, retiredAt },
        cancelledBookings: 4,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.employee.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { retiredAt, services: { set: [] } },
        include: WITH_USER,
      });
      expect(tx.booking.updateMany).toHaveBeenCalledWith({
        where: {
          employeeId: 1,
          status: 'BOOKED',
          startsAt: { gt: retiredAt },
        },
        data: { status: 'CANCELLED' },
      });
    });
  });

  describe('translates Prisma errors, keeping the original as cause', () => {
    it("translates a violation of the userId+businessId partial index (recontratar's guard) into ConflictError", async () => {
      const cause = knownError('P2002');
      // Where ADR 0004 says @prisma/adapter-pg puts the violated index's name: the partial unique
      // index that guards one active Employee per (userId, businessId), alimentando un error de Prisma falso.
      cause.meta = {
        driverAdapterError: {
          cause: { constraint: { index: 'Employee_userId_businessId_key' } },
        },
      };
      prisma.employee.create.mockRejectedValue(cause);

      const error = await repository
        .create({ userId: 1, businessId: 1 })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toHaveProperty('cause', cause);
    });

    it('translates retiring an unknown Employee into NotFoundError', async () => {
      const cause = knownError('P2025');
      tx.employee.update.mockRejectedValue(cause);

      const error = await repository
        .retire(999, new Date('2026-02-01T00:00:00.000Z'))
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toHaveProperty('cause', cause);
    });

    it('translates a database failure, keeping the original as cause', async () => {
      const cause = new Error('connection refused at 10.0.0.1');
      prisma.employee.findMany.mockRejectedValue(cause);

      const error = await repository.listByIds([1]).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(DatabaseOperationError);
      expect(error).toHaveProperty('cause', cause);
      expect((error as Error).message).not.toContain(cause.message);
    });
  });
});
