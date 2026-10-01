import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../../domain/errors';
import { Service, ServiceCategory } from '../../../domain/services/service';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import {
  PrismaServicesRepository,
  VISIBLE_EMPLOYEES,
} from '../prisma-services.repository';

const SERVICE_ROW = {
  id: 1,
  branchId: 1,
  name: 'Haircut',
  description: 'A basic haircut',
  category: ServiceCategory.SPA,
  durationMinutes: 30,
  price: '20', // Prisma returns Decimal columns as a Decimal-like; Number() reads a numeric string just as well
  depositPercent: 30,
  requiresApproval: false,
  retiredAt: null,
  slug: 'haircut',
  hidden: false,
  prepMinutes: 0,
  dailyLimit: null,
  employees: [
    { availabilityId: 10, employee: { id: 7, user: { name: 'Ana Pérez' } } },
  ],
};

const SERVICE: Service = {
  id: 1,
  branchId: 1,
  name: 'Haircut',
  description: 'A basic haircut',
  category: ServiceCategory.SPA,
  durationMinutes: 30,
  price: 20,
  depositPercent: 30,
  requiresApproval: false,
  retiredAt: null,
  slug: 'haircut',
  hidden: false,
  prepMinutes: 0,
  dailyLimit: null,
  employees: [{ id: 7, name: 'Ana Pérez', availabilityId: 10 }],
};

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

describe('PrismaServicesRepository', () => {
  const tx = {
    service: { update: jest.fn() },
    booking: { updateMany: jest.fn() },
  };
  const prisma = {
    service: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
  };
  const SERVICE_ROW_WITH_TWO: typeof SERVICE_ROW = {
    ...SERVICE_ROW,
    employees: [
      { availabilityId: 10, employee: { id: 7, user: { name: 'Ana Pérez' } } },
      { availabilityId: 11, employee: { id: 8, user: { name: 'Bruno Díaz' } } },
    ],
  };
  const repository = new PrismaServicesRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((run) => run(tx));
  });

  it('creates a Service linking each Employee to the Availability they attend it with, converting its Decimal price to a number', async () => {
    prisma.service.create.mockResolvedValue(SERVICE_ROW);

    await expect(
      repository.create({
        branchId: 1,
        name: 'Haircut',
        description: 'A basic haircut',
        category: ServiceCategory.SPA,
        durationMinutes: 30,
        price: 20,
        depositPercent: 30,
        requiresApproval: false,
        slug: 'haircut',
        hidden: false,
        prepMinutes: 0,
        dailyLimit: null,
        employees: [
          { employeeId: 7, availabilityId: 70 },
          { employeeId: 8, availabilityId: 80 },
        ],
      }),
    ).resolves.toEqual(SERVICE);
    expect(prisma.service.create).toHaveBeenCalledWith({
      data: {
        branchId: 1,
        name: 'Haircut',
        description: 'A basic haircut',
        category: ServiceCategory.SPA,
        durationMinutes: 30,
        price: 20,
        depositPercent: 30,
        requiresApproval: false,
        slug: 'haircut',
        hidden: false,
        prepMinutes: 0,
        dailyLimit: null,
        employees: {
          create: [
            { employeeId: 7, availabilityId: 70 },
            { employeeId: 8, availabilityId: 80 },
          ],
        },
      },
      include: VISIBLE_EMPLOYEES,
    });
  });

  it('lists only active Services of a Branch', async () => {
    prisma.service.findMany.mockResolvedValue([SERVICE_ROW]);

    await expect(repository.listActiveByBranch(1)).resolves.toEqual([SERVICE]);
    expect(prisma.service.findMany).toHaveBeenCalledWith({
      where: { branchId: 1, retiredAt: null },
      include: VISIBLE_EMPLOYEES,
    });
  });

  describe('addEmployee', () => {
    it('links the Employee to the Service with the given Availability', async () => {
      prisma.service.findUnique.mockResolvedValue({ employees: [] });
      prisma.service.update.mockResolvedValue(SERVICE_ROW_WITH_TWO);

      await expect(
        repository.addEmployee({
          serviceId: 1,
          employeeId: 8,
          availabilityId: 80,
        }),
      ).resolves.toEqual({
        ...SERVICE,
        employees: [
          { id: 7, name: 'Ana Pérez', availabilityId: 10 },
          { id: 8, name: 'Bruno Díaz', availabilityId: 11 },
        ],
      });
      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { employees: { create: { employeeId: 8, availabilityId: 80 } } },
        include: VISIBLE_EMPLOYEES,
      });
    });

    it('throws ConflictError when the Employee is already linked, without updating', async () => {
      prisma.service.findUnique.mockResolvedValue({
        employees: [{ employeeId: 7 }],
      });

      await expect(
        repository.addEmployee({
          serviceId: 1,
          employeeId: 7,
          availabilityId: 70,
        }),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(prisma.service.update).not.toHaveBeenCalled();
    });

    it('translates the link key catching two links racing into ConflictError about the Employee, not the name', async () => {
      const cause = knownError('P2002');
      prisma.service.findUnique.mockResolvedValue({ employees: [] });
      prisma.service.update.mockRejectedValue(cause);

      const error = await repository
        .addEmployee({ serviceId: 1, employeeId: 8, availabilityId: 80 })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toHaveProperty(
        'message',
        'Employee already in charge of this Service',
      );
      expect(error).toHaveProperty('cause', cause);
    });

    it('throws NotFoundError for an unknown Service', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(
        repository.addEmployee({
          serviceId: 999,
          employeeId: 7,
          availabilityId: 70,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('removeEmployee', () => {
    const now = new Date('2026-02-01T00:00:00.000Z');

    it('unlinks the Employee from the Service and cancels their future BOOKED Turnos for it, atomically', async () => {
      tx.service.update.mockResolvedValue(SERVICE_ROW);
      tx.booking.updateMany.mockResolvedValue({ count: 2 });

      await expect(repository.removeEmployee(1, 7, now)).resolves.toEqual({
        service: SERVICE,
        cancelledBookings: 2,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.service.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { employees: { deleteMany: { employeeId: 7 } } },
        include: VISIBLE_EMPLOYEES,
      });
      expect(tx.booking.updateMany).toHaveBeenCalledWith({
        where: {
          serviceId: 1,
          employeeId: 7,
          status: { in: ['PENDING', 'BOOKED'] },
          startsAt: { gt: now },
        },
        data: { status: 'CANCELLED' },
      });
    });
  });

  it('lists active Services an Employee is in charge of', async () => {
    prisma.service.findMany.mockResolvedValue([SERVICE_ROW]);

    await expect(repository.listActiveByEmployee(7)).resolves.toEqual([
      SERVICE,
    ]);
    expect(prisma.service.findMany).toHaveBeenCalledWith({
      where: { retiredAt: null, employees: { some: { employeeId: 7 } } },
      include: VISIBLE_EMPLOYEES,
    });
  });

  describe('retire', () => {
    const retiredAt = new Date('2026-02-01T00:00:00.000Z');

    it('sets retiredAt, unlinks its Employees and cancels the Service future BOOKED Turnos, atomically', async () => {
      tx.service.update.mockResolvedValue({ ...SERVICE_ROW, retiredAt });
      tx.booking.updateMany.mockResolvedValue({ count: 3 });

      await expect(repository.retire(1, retiredAt)).resolves.toEqual({
        service: { ...SERVICE, retiredAt },
        cancelledBookings: 3,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.service.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { retiredAt, employees: { deleteMany: {} } },
        include: VISIBLE_EMPLOYEES,
      });
      expect(tx.booking.updateMany).toHaveBeenCalledWith({
        where: {
          serviceId: 1,
          status: { in: ['PENDING', 'BOOKED'] },
          startsAt: { gt: retiredAt },
        },
        data: { status: 'CANCELLED' },
      });
    });
  });

  describe('the partial unique index on (branchId, slug)', () => {
    const slugViolation = new Prisma.PrismaClientKnownRequestError('vendor', {
      code: 'P2002',
      clientVersion: '7.10.0',
      meta: {
        driverAdapterError: {
          cause: { constraint: { index: 'Service_branchId_slug_key' } },
        },
      },
    });

    it.each(['create', 'update'] as const)(
      '%s: a violation becomes a ConflictError about the booking link, not the name',
      async (method) => {
        prisma.service[method].mockRejectedValue(slugViolation);

        const error = await (
          method === 'create'
            ? repository.create({
                branchId: 1,
                name: 'Haircut',
                description: null,
                category: ServiceCategory.SPA,
                durationMinutes: 30,
                price: 20,
                depositPercent: null,
                requiresApproval: false,
                slug: 'haircut',
                hidden: false,
                prepMinutes: 0,
                dailyLimit: null,
                employees: [],
              })
            : repository.update(1, { slug: 'haircut' })
        ).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ConflictError);
        expect(error).toHaveProperty(
          'message',
          'Service booking link already in use',
        );
      },
    );
  });

  describe('translates Prisma errors, keeping the original as cause', () => {
    const calls = {
      create: () =>
        repository.create({
          branchId: 1,
          name: 'Haircut',
          description: null,
          category: ServiceCategory.SPA,
          durationMinutes: 30,
          price: 20,
          depositPercent: null,
          requiresApproval: false,
          slug: 'haircut',
          hidden: false,
          prepMinutes: 0,
          dailyLimit: null,
          employees: [{ employeeId: 7, availabilityId: 70 }],
        }),
      findById: () => repository.findById(1),
      update: () => repository.update(1, { name: 'New name' }),
    };
    const prismaCall = {
      create: prisma.service.create,
      findById: prisma.service.findUnique,
      update: prisma.service.update,
    };

    it.each([
      ['create', 'P2002', ConflictError],
      ['update', 'P2002', ConflictError],
      ['update', 'P2025', NotFoundError],
    ] as const)('%s: %s into %p', async (method, code, domainError) => {
      const cause = knownError(code);
      prismaCall[method].mockRejectedValue(cause);

      const error = await calls[method]().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(domainError);
      expect(error).toHaveProperty('cause', cause);
    });

    it.each(
      Object.keys(calls).flatMap((method) => [
        [method, knownError('P1001')],
        [method, new Error('connection refused at 10.0.0.1')],
      ]) as [keyof typeof calls, Error][],
    )(
      '%s: anything else into DatabaseOperationError (%p)',
      async (method, cause) => {
        prismaCall[method].mockRejectedValue(cause);

        const error = await calls[method]().catch((e: unknown) => e);

        expect(error).toBeInstanceOf(DatabaseOperationError);
        expect(error).toHaveProperty('cause', cause);
        expect((error as Error).message).not.toContain(cause.message);
      },
    );
  });
});
