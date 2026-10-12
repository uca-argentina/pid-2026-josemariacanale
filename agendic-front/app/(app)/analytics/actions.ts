'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import type { DI_RETURN_TYPES } from '@/di/types';
import type { AnalyticsQuery } from '@/src/entities/models/analytics';

/** Lo que presenta el controller: tarjetas, gráfico, ranking, Calificaciones y Servicios del filtro. */
export type PersonalAnalyticsData = Awaited<ReturnType<DI_RETURN_TYPES['IGetPersonalAnalyticsController']>>;

/** Lo que la UI recibe de la carga: los datos, o un error sin detalle (el real va al reporte de fallas). */
export type PersonalAnalyticsResult = { ok: true; data: PersonalAnalyticsData } | { ok: false };

/**
 * Las analíticas de los Servicios personales del Usuario en un rango de días. El rango sale del browser,
 * que es quien sabe en qué zona está "hoy": por eso la carga es una acción y no parte de la página.
 */
export async function loadPersonalAnalyticsAction(query: AnalyticsQuery): Promise<PersonalAnalyticsResult> {
    try {
        return { ok: true, data: await getInjection('IGetPersonalAnalyticsController')(query) };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return { ok: false };
    }
}
