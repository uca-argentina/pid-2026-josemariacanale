import { cookies } from 'next/headers';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { OFFLINE_SESSION_COOKIE } from '@/src/entities/models/offline-session';
import { OfflineAuthenticationService } from '@/src/infrastructure/services/offline-authentication.service';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));

const authenticationService = new OfflineAuthenticationService();

const withSessionCookie = (value: string | undefined) =>
    jest.mocked(cookies).mockResolvedValue({
        get: (name: string) => (name === OFFLINE_SESSION_COOKIE && value !== undefined ? { name, value } : undefined),
    } as never);

afterEach(() => jest.resetAllMocks());

describe('OfflineAuthenticationService', () => {
    it('builds the Usuario from the clerkId in the cookie', async () => {
        withSessionCookie('user_ana');

        await expect(authenticationService.getCurrentUser()).resolves.toEqual({
            id: 'user_ana',
            email: 'user_ana@local.test',
            name: 'user_ana',
        });
    });

    it('hands the back a dev:<clerkId> token', async () => {
        withSessionCookie('user_ana');

        await expect(authenticationService.getAccessToken()).resolves.toBe('dev:user_ana');
    });

    it('throws UnauthenticatedError without the cookie', async () => {
        withSessionCookie(undefined);

        await expect(authenticationService.getCurrentUser()).rejects.toBeInstanceOf(UnauthenticatedError);
        await expect(authenticationService.getAccessToken()).rejects.toBeInstanceOf(UnauthenticatedError);
    });
});
