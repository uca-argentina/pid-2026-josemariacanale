import { ExternalServiceError } from '../../domain/errors';
import { ClerkBackendAuth } from './clerk-backend-auth';

const getUser = jest.fn();
const deleteUser = jest.fn();

jest.mock('@clerk/backend', () => ({
  createClerkClient: () => ({ users: { getUser, deleteUser } }),
  verifyToken: jest.fn(),
}));

/** A Clerk Backend SDK user, with only the fields `getProfile` reads. */
const clerkUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  firstName: 'Ana',
  lastName: 'Pérez',
  primaryEmailAddressId: 'idn_1',
  emailAddresses: [{ id: 'idn_1', emailAddress: 'ana@example.com' }],
  hasImage: true,
  imageUrl: 'https://img.clerk.com/ana.png',
  ...overrides,
});

describe('ClerkBackendAuth.getProfile', () => {
  const auth = new ClerkBackendAuth();

  beforeEach(() => jest.resetAllMocks());

  it('seeds the imageUrl Clerk has for the Usuario', async () => {
    getUser.mockResolvedValue(clerkUser());

    const profile = await auth.getProfile('user_1');

    expect(profile.imageUrl).toBe('https://img.clerk.com/ana.png');
  });

  it('seeds a null imageUrl when hasImage is false, even with an imageUrl set', async () => {
    getUser.mockResolvedValue(
      clerkUser({ hasImage: false, imageUrl: 'https://img.clerk.com/placeholder.png' }),
    );

    const profile = await auth.getProfile('user_1');

    expect(profile.imageUrl).toBeNull();
  });

  it('discards a malformed imageUrl rather than failing', async () => {
    getUser.mockResolvedValue(clerkUser({ imageUrl: 'not a url' }));

    const profile = await auth.getProfile('user_1');

    expect(profile.imageUrl).toBeNull();
  });
});

describe('ClerkBackendAuth.deleteUser', () => {
  const auth = new ClerkBackendAuth();

  beforeEach(() => jest.resetAllMocks());

  it('deletes the Usuario in Clerk', async () => {
    deleteUser.mockResolvedValue({});

    await expect(auth.deleteUser('user_1')).resolves.toBeUndefined();
    expect(deleteUser).toHaveBeenCalledWith('user_1');
  });

  it('is not an error when Clerk no longer has the Usuario', async () => {
    deleteUser.mockRejectedValue({
      status: 404,
      errors: [{ code: 'resource_not_found' }],
    });

    await expect(auth.deleteUser('user_1')).resolves.toBeUndefined();
  });

  it('wraps any other Clerk failure in ExternalServiceError, keeping the cause', async () => {
    const failure = { status: 500 };
    deleteUser.mockRejectedValue(failure);

    await expect(auth.deleteUser('user_1')).rejects.toMatchObject({
      constructor: ExternalServiceError,
      message: 'No se pudo borrar el Usuario en el Proveedor de autenticación',
      cause: failure,
    });
  });
});
