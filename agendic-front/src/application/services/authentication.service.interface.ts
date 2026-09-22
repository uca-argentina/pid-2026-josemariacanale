import type { User } from '@/src/entities/models/user';

export interface IAuthenticationService {
    // Throws UnauthenticatedError when there is no Sesión.
    getCurrentUser(): Promise<User>;
}
