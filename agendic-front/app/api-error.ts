import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError } from '@/src/entities/errors/common';

// A 401 from the API means the SesiÃ³n is invalid or expired: the Usuario fixes it by signing in
// again. Every other failure (5xx, network down, unexpected body) is the back failing, and the
// framework layer answers it with the aviso instead.
export function isSessionExpired(error: unknown): boolean {
    return error instanceof UnauthenticatedError || (error instanceof ApiRequestError && error.status === 401);
}

/** A 403 of a Usuario dado de baja (ADR 0023): the Sesión is still open in Clerk but the back rejects it for good. */
export function isUserDeactivated(error: unknown): boolean {
    return error instanceof ApiRequestError && error.status === 403 && /dado de baja/i.test(error.message);
}
