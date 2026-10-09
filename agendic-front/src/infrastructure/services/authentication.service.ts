import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import { auth, currentUser } from '@clerk/nextjs/server';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { userSchema, type User } from '@/src/entities/models/user';

// The only place in the project that imports the Clerk SDK server-side.
export class AuthenticationService implements IAuthenticationService {
    async getCurrentUser(): Promise<User> {
        const clerkUser = await currentUser().catch((cause: unknown) => {
            // Darse de baja borra al Usuario en Clerk (ADR 0023) y la Sesión sigue en la cookie hasta que el cliente la cierra: Clerk responde 404.
            if (isClerkAPIResponseError(cause) && cause.status === 404) throw new UnauthenticatedError('No hay Sesión', { cause });
            throw cause;
        });
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
