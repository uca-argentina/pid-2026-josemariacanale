import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../../domain/errors';
import { User } from '../../../domain/users/user';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaUsersRepository } from '../prisma-users.repository';

const ANA: User = {
  id: 1,
  clerkId: 'user_clerk_1',
  name: 'Ana',
  email: 'ana@example.com',
  slug: null,
  imageUrl: null,
  createdAt: new Date('2026-01-01T12:00:00.000Z'),
  deletedAt: null,
};

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

describe('PrismaUsersRepository', () => {
  const prisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const repository = new PrismaUsersRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => jest.resetAllMocks());

  it('creates a User and returns only its domain fields, even when the row has extra columns', async () => {
    prisma.user.create.mockResolvedValue({ ...ANA, futureColumn: 'x' });
    const data = {
      clerkId: 'user_clerk_1',
      name: 'Ana',
      email: 'ana@example.com',
      imageUrl: null,
    };

    await expect(repository.create(data)).resolves.toEqual(ANA);
    // Born with Horas laborables, in the same write: Monday to Friday 09:00–17:00 in Buenos Aires, the default.
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        ...data,
        availabilities: {
          create: {
            name: 'Horas laborables',
            timeZone: 'America/Argentina/Buenos_Aires',
            isDefault: true,
            intervals: {
              create: [
                {
                  days: [1, 2, 3, 4, 5],
                  startTime: new Date('1970-01-01T09:00:00.000Z'),
                  endTime: new Date('1970-01-01T17:00:00.000Z'),
                },
              ],
            },
          },
        },
      },
    });
  });

  it('creates a User with the seeded imageUrl', async () => {
    const withImage = { ...ANA, imageUrl: 'https://img.clerk.com/ana.png' };
    prisma.user.create.mockResolvedValue(withImage);

    await expect(
      repository.create({
        clerkId: 'user_clerk_1',
        name: 'Ana',
        email: 'ana@example.com',
        imageUrl: 'https://img.clerk.com/ana.png',
      }),
    ).resolves.toEqual(withImage);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageUrl: 'https://img.clerk.com/ana.png',
        }),
      }),
    );
  });

  it('finds by id', async () => {
    prisma.user.findUnique.mockResolvedValue(ANA);

    await expect(repository.findById(1)).resolves.toEqual(ANA);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('finds by Clerk id', async () => {
    prisma.user.findUnique.mockResolvedValue(ANA);

    await expect(repository.findByClerkId('user_clerk_1')).resolves.toEqual(
      ANA,
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { clerkId: 'user_clerk_1' },
    });
  });

  it('finds by email, without distinguishing casing', async () => {
    prisma.user.findFirst.mockResolvedValue(ANA);

    await expect(repository.findByEmail('Ana@Example.com')).resolves.toEqual(
      ANA,
    );
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: { equals: 'Ana@Example.com', mode: 'insensitive' },
        deletedAt: null,
      },
    });
  });

  it('updates only the name', async () => {
    prisma.user.update.mockResolvedValue(ANA);

    await expect(repository.update(1, { name: 'Ana María' })).resolves.toEqual(
      ANA,
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'Ana María' },
    });
  });

  it('updates only the email', async () => {
    prisma.user.update.mockResolvedValue(ANA);

    await expect(
      repository.update(1, { email: 'ana.new@example.com' }),
    ).resolves.toEqual(ANA);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { email: 'ana.new@example.com' },
    });
  });

  it('updates the name and the email together', async () => {
    prisma.user.update.mockResolvedValue(ANA);

    await expect(
      repository.update(1, {
        name: 'Ana María',
        email: 'ana.new@example.com',
      }),
    ).resolves.toEqual(ANA);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'Ana María', email: 'ana.new@example.com' },
    });
  });

  it('updates only the imageUrl, and a null drops it', async () => {
    prisma.user.update.mockResolvedValue(ANA);

    await repository.update(1, { imageUrl: 'https://img.clerk.com/ana.png' });
    await repository.update(1, { imageUrl: null });

    expect(prisma.user.update).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      data: { imageUrl: 'https://img.clerk.com/ana.png' },
    });
    expect(prisma.user.update).toHaveBeenNthCalledWith(2, {
      where: { id: 1 },
      data: { imageUrl: null },
    });
  });

  describe('translates Prisma errors, keeping the original as cause', () => {
    const calls = {
      create: () =>
        repository.create({
          clerkId: 'user_clerk_1',
          name: 'Ana',
          email: 'ana@example.com',
          imageUrl: null,
        }),
      findById: () => repository.findById(1),
      update: () => repository.update(1, { name: 'Ana' }),
    };
    const prismaCall = {
      create: prisma.user.create,
      findById: prisma.user.findUnique,
      update: prisma.user.update,
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

    it('update: a taken slug into ConflictError that names the Enlace de reserva', async () => {
      const cause = knownError('P2002');
      cause.meta = {
        driverAdapterError: { cause: { constraint: { index: 'User_slug_key' } } },
      };
      prisma.user.update.mockRejectedValue(cause);

      const error = await repository.update(1, { slug: 'ana' }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect((error as Error).message).toBe('Booking link already in use');
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
