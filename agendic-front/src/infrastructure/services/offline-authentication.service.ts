import { cookies } from 'next/headers';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { OFFLINE_SESSION_COOKIE, offlineAccessToken } from '@/src/entities/models/offline-session';
import { userSchema, type User } from '@/src/entities/models/user';

// Stand-in for AuthenticationService when NEXT_PUBLIC_AUTH_OFFLINE=true: the Sesión is just the clerkId in a cookie.
export class OfflineAuthenticationService implements IAuthenticationService {
    async getCurrentUser(): Promise<User> {
        const clerkId = await this.clerkId();
        return userSchema.parse({ id: clerkId, email: `${clerkId}@local.test`, name: clerkId });
    }

    async getAccessToken(): Promise<string> {
        return offlineAccessToken(await this.clerkId());
    }

    private async clerkId(): Promise<string> {
        const clerkId = (await cookies()).get(OFFLINE_SESSION_COOKIE)?.value;
        if (!clerkId) throw new UnauthenticatedError(`No hay Sesión offline: falta la cookie ${OFFLINE_SESSION_COOKIE}`);
        return clerkId;
    }
}
