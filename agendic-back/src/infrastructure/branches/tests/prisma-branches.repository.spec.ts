import { Branch } from '../../../domain/branches/branch';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../../domain/errors';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaBranchesRepository } from '../prisma-branches.repository';

const BRANCH: Branch = {
  id: 1,
  businessId: 1,
  name: 'Downtown',
  address: '123 Main St',
  timeZone: 'America/Argentina/Buenos_Aires',
  slug: 'downtown',
  description: null,
};

const BRANCH_ROW = {
  id: 1,
  businessId: 1,
  name: 'Downtown',
  address: '123 Main St',
  timeZone: 'America/Argentina/Buenos_Aires',
  slug: 'downtown',
  description: null,
};

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

describe('PrismaBranchesRepository', () => {
  const prisma = {
    branch: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const repository = new PrismaBranchesRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => jest.resetAllMocks());

  it('creates a Sucursal with one image per URL, ordered as given, in the same create', async () => {
    prisma.branch.create.mockResolvedValue({
      ...BRANCH_ROW,
      images: [
        { id: 10, branchId: 1, url: 'https://files.example.com/a', order: 0 },
        { id: 11, branchId: 1, url: 'https://files.example.com/b', order: 1 },
      ],
    });

    await expect(
      repository.createWithImages(
        {
          businessId: 1,
          name: 'Downtown',
          address: '123 Main St',
          timeZone: 'America/Argentina/Buenos_Aires',
          slug: 'downtown',
        },
        ['https://files.example.com/a', 'https://files.example.com/b'],
      ),
    ).resolves.toEqual({
      branch: BRANCH,
      images: [
        { id: 10, branchId: 1, url: 'https://files.example.com/a', order: 0 },
        { id: 11, branchId: 1, url: 'https://files.example.com/b', order: 1 },
      ],
    });
    expect(prisma.branch.create).toHaveBeenCalledWith({
      data: {
        businessId: 1,
        name: 'Downtown',
        address: '123 Main St',
        timeZone: 'America/Argentina/Buenos_Aires',
        slug: 'downtown',
        images: {
          create: [
            { url: 'https://files.example.com/a', order: 0 },
            { url: 'https://files.example.com/b', order: 1 },
          ],
        },
      },
      include: {
        images: {
          select: { id: true, branchId: true, url: true, order: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  });

  it('reads a Branch, converting Prisma Time values back to HH:mm', async () => {
    prisma.branch.findUnique.mockResolvedValue(BRANCH_ROW);

    await expect(repository.findById(1)).resolves.toEqual(BRANCH);
  });

  it('lists Branches by Business', async () => {
    prisma.branch.findMany.mockResolvedValue([BRANCH_ROW]);

    await expect(repository.listByBusiness(1)).resolves.toEqual([BRANCH]);
  });

  it('updates only the given fields, converting hours when present', async () => {
    prisma.branch.update.mockResolvedValue(BRANCH_ROW);

    await repository.update(1, { name: 'New name' });

    expect(prisma.branch.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        name: 'New name',
        address: undefined,
        timeZone: undefined,
        slug: undefined,
      },
    });
  });

  describe('translates Prisma errors, keeping the original as cause', () => {
    const calls = {
      createWithImages: () =>
        repository.createWithImages(BRANCH, ['https://files.example.com/a']),
      findById: () => repository.findById(1),
      update: () => repository.update(1, { name: 'New name' }),
    };
    const prismaCall = {
      createWithImages: prisma.branch.create,
      findById: prisma.branch.findUnique,
      update: prisma.branch.update,
    };

    it.each([['update', 'P2025', NotFoundError]] as const)(
      '%s: %s into %p',
      async (method, code, domainError) => {
        const cause = knownError(code);
        prismaCall[method].mockRejectedValue(cause);

        const error = await calls[method]().catch((e: unknown) => e);

        expect(error).toBeInstanceOf(domainError);
        expect(error).toHaveProperty('cause', cause);
      },
    );

    it.each(['createWithImages', 'update'] as const)(
      '%s: P2002 on the slug index into a ConflictError naming the Enlace de reserva',
      async (method) => {
        const cause = knownError('P2002');
        // Where ADR 0004 says @prisma/adapter-pg puts the violated index's name.
        cause.meta = {
          driverAdapterError: {
            cause: { constraint: { index: 'Branch_businessId_slug_key' } },
          },
        };
        prismaCall[method].mockRejectedValue(cause);

        const error = await calls[method]().catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ConflictError);
        expect(error).toHaveProperty('message', 'Booking link already in use');
        expect(error).toHaveProperty('cause', cause);
      },
    );

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
