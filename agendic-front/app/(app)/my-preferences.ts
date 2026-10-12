import { cache } from 'react';
import { isSessionExpired, isUserDeactivated } from '@/app/api-error';
import { getInjection } from '@/di/container';
import { DEFAULT_PREFERENCES } from '@/src/entities/models/user';

/**
 * Las preferencias del Usuario, o las de fábrica si la consulta falla: no vale un error de página.
 * Cacheada por request, así el layout y la página piden `GET /users/me` una sola vez.
 */
export const myPreferences = cache(async () => {
    try {
        return await getInjection('IGetMyPreferencesController')();
    } catch (error) {
        if (!isSessionExpired(error) && !isUserDeactivated(error)) getInjection('ICrashReporterService').report(error);
        return DEFAULT_PREFERENCES;
    }
});
