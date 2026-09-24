import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError } from '@/src/entities/errors/common';

// A 401 from the API means the Sesión is invalid or expired: the Usuario fixes it by signing in
// again. Every other failure (5xx, network down, unexpected body) is the back failing, and the
// framework layer answers it with the aviso instead.
export function isSessionExpired(error: unknown): boolean {
    return error instanceof UnauthenticatedError || (error instanceof ApiRequestError && error.status === 401);
}
