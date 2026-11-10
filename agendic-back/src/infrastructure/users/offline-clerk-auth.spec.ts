import { NotConfiguredError, UnauthenticatedError } from '../../domain/errors';
import { OfflineClerkAuth } from './offline-clerk-auth';

describe('OfflineClerkAuth', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('resolves a dev:<clerkId> token to that clerkId', async () => {
    await expect(
      new OfflineClerkAuth().verifyToken('dev:user_ana'),
    ).resolves.toEqual({ clerkId: 'user_ana' });
  });

  it.each([undefined, '', 'dev:', 'eyJhbGciOi.real.jwt'])(
    'rejects %p as unauthenticated',
    async (token) => {
      await expect(
        new OfflineClerkAuth().verifyToken(token),
      ).rejects.toBeInstanceOf(UnauthenticatedError);
    },
  );

  it('seeds a profile from the clerkId alone', async () => {
    await expect(
      new OfflineClerkAuth().getProfile('user_Ana'),
    ).resolves.toEqual({
      name: 'user_Ana',
      email: 'user_ana@local.test',
      imageUrl: null,
    });
  });

  it('refuses to be built in production', () => {
    process.env.NODE_ENV = 'production';

    expect(() => new OfflineClerkAuth()).toThrow(NotConfiguredError);
  });
});
