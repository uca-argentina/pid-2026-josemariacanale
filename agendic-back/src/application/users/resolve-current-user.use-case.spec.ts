import { ConflictError } from '../../domain/errors';
import { ClerkAuth } from '../../domain/users/clerk-auth';
import { User } from '../../domain/users/user';
import { UsersRepository } from '../../domain/users/users.repository';
import { ResolveCurrentUserUseCase } from './resolve-current-user.use-case';

const user = (overrides: Partial<User> = {}): User => ({
  id: 1,
  clerkId: 'user_1',
  name: 'Dani',
  email: 'dani@example.com',
  slug: null,
  imageUrl: null,
  createdAt: new Date('2026-10-09T00:00:00Z'),
  deletedAt: null,
  ...overrides,
});

const clerkAuth = {
  verifyToken: async () => ({ clerkId: 'user_1' }),
  getProfile: async () => ({
    name: 'Dani',
    email: 'dani@example.com',
    imageUrl: null,
  }),
} as unknown as ClerkAuth;

describe('Resolver el Usuario de la Sesión', () => {
  it('crea el Usuario la primera vez', async () => {
    const created = user();
    const users = {
      findByClerkId: async () => null,
      create: async () => created,
    } as unknown as UsersRepository;

    const result = await new ResolveCurrentUserUseCase(clerkAuth, users).execute('token');

    expect(result).toBe(created);
  });

  it('devuelve el Usuario que creó otro request al mismo tiempo en vez de fallar con 409', async () => {
    const winner = user();
    let lookups = 0;
    const users = {
      findByClerkId: async () => (lookups++ === 0 ? null : winner),
      create: async () => {
        throw new ConflictError('Clerk identity already registered');
      },
    } as unknown as UsersRepository;

    const result = await new ResolveCurrentUserUseCase(clerkAuth, users).execute('token');

    expect(result).toBe(winner);
  });

  it('propaga el conflicto si el Usuario sigue sin existir', async () => {
    const users = {
      findByClerkId: async () => null,
      create: async () => {
        throw new ConflictError('Clerk identity already registered');
      },
    } as unknown as UsersRepository;

    await expect(
      new ResolveCurrentUserUseCase(clerkAuth, users).execute('token'),
    ).rejects.toThrow(ConflictError);
  });
});
