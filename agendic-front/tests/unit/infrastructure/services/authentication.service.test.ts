import { auth, currentUser } from '@clerk/nextjs/server';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { AuthenticationService } from '@/src/infrastructure/services/authentication.service';

jest.mock('@clerk/nextjs/server', () => ({ currentUser: jest.fn(), auth: jest.fn() }));

const mockedCurrentUser = jest.mocked(currentUser);
const authenticationService = new AuthenticationService();

afterEach(() => jest.resetAllMocks());

const clerkUser = (
    overrides: Partial<{ firstName: string | null; lastName: string | null; hasImage: boolean; imageUrl: string }> = {},
) => ({
    id: 'user_123',
    primaryEmailAddressId: 'email_1',
    emailAddresses: [{ id: 'email_1', emailAddress: 'ana@negocio.com' }],
    firstName: 'Ana',
    lastName: 'Pérez',
    hasImage: false,
    imageUrl: 'https://img.clerk.com/placeholder',
    ...overrides,
});

describe('AuthenticationService', () => {
    describe('getAccessToken', () => {
        it('returns the Clerk session token', async () => {
            jest.mocked(auth).mockResolvedValue({ getToken: async () => 'tok' } as never);

            await expect(authenticationService.getAccessToken()).resolves.toBe('tok');
        });

        it('throws UnauthenticatedError when there is no token', async () => {
            jest.mocked(auth).mockResolvedValue({ getToken: async () => null } as never);

            await expect(authenticationService.getAccessToken()).rejects.toBeInstanceOf(UnauthenticatedError);
        });
    });

    describe('getCurrentUser', () => {
        it('returns the Usuario behind the Sesión', async () => {
            mockedCurrentUser.mockResolvedValue(clerkUser() as never);

            await expect(authenticationService.getCurrentUser()).resolves.toEqual({
                id: 'user_123',
                email: 'ana@negocio.com',
                name: 'Ana Pérez',
            });
        });

        it('throws UnauthenticatedError when there is no Sesión', async () => {
            mockedCurrentUser.mockResolvedValue(null);

            await expect(authenticationService.getCurrentUser()).rejects.toBeInstanceOf(UnauthenticatedError);
        });

        it('falls back to the email when the Usuario has no name', async () => {
            mockedCurrentUser.mockResolvedValue(clerkUser({ firstName: null, lastName: null }) as never);

            await expect(authenticationService.getCurrentUser()).resolves.toMatchObject({
                name: 'ana@negocio.com',
            });
        });

        it('returns the photo when the Usuario has one (e.g. from Google)', async () => {
            mockedCurrentUser.mockResolvedValue(
                clerkUser({ hasImage: true, imageUrl: 'https://img.clerk.com/google-photo' }) as never,
            );

            await expect(authenticationService.getCurrentUser()).resolves.toMatchObject({
                imageUrl: 'https://img.clerk.com/google-photo',
            });
        });

        it('omits the photo when Clerk only has its placeholder', async () => {
            mockedCurrentUser.mockResolvedValue(clerkUser() as never);

            const user = await authenticationService.getCurrentUser();
            expect(user.imageUrl).toBeUndefined();
        });

        it('drops an unusable photo URL instead of failing the whole Usuario', async () => {
            mockedCurrentUser.mockResolvedValue(clerkUser({ hasImage: true, imageUrl: 'not a url' }) as never);

            const user = await authenticationService.getCurrentUser();
            expect(user).toMatchObject({ name: 'Ana Pérez', email: 'ana@negocio.com' });
            expect(user.imageUrl).toBeUndefined();
        });
    });
});
