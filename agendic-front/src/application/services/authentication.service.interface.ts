import type { User } from '@/src/entities/models/user';

export interface IAuthenticationService {
    // Throws UnauthenticatedError when there is no Sesión.
    getCurrentUser(): Promise<User>;
    // Bearer token for the backend API. Throws UnauthenticatedError when there is no Sesión.
    getAccessToken(): Promise<string>;
}
