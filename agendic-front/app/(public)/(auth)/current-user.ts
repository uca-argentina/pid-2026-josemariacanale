import { getInjection } from '@/di/container';
import type { DI_RETURN_TYPES } from '@/di/types';
import { UnauthenticatedError } from '@/src/entities/errors/auth';

export type CurrentUser = Awaited<ReturnType<DI_RETURN_TYPES['IGetCurrentUserController']>>;

export async function getCurrentUser(): Promise<CurrentUser | null> {
    try {
        const controller = getInjection('IGetCurrentUserController');
        return await controller();
    } catch (error) {
        if (error instanceof UnauthenticatedError) return null;
        getInjection('ICrashReporterService').report(error);
        return null;
    }
}
