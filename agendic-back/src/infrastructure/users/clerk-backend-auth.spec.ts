import { ClerkBackendAuth } from './clerk-backend-auth';

const getUser = jest.fn();

jest.mock('@clerk/backend', () => ({
  createClerkClient: () => ({ users: { getUser } }),
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
