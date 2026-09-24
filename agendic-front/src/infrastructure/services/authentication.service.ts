import { auth, currentUser } from '@clerk/nextjs/server';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { userSchema, type User } from '@/src/entities/models/user';

// The only place in the project that imports the Clerk SDK server-side.
export class AuthenticationService implements IAuthenticationService {
    async getCurrentUser(): Promise<User> {
        const clerkUser = await currentUser();
        if (!clerkUser) throw new UnauthenticatedError('No hay Sesión');

        const email = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ?? '';
        const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim() || email;

        // hasImage is false when Clerk would only serve its generated placeholder. The photo is
        // cosmetic, so an unparseable URL is dropped rather than failing the whole Usuario.
        const imageUrl = clerkUser.hasImage && URL.canParse(clerkUser.imageUrl) ? clerkUser.imageUrl : undefined;

        return userSchema.parse({ id: clerkUser.id, email, name, imageUrl });
    }

    async getAccessToken(): Promise<string> {
        const { getToken } = await auth();
        const token = await getToken();
        if (!token) throw new UnauthenticatedError('No hay Sesión');
        return token;
    }
}
