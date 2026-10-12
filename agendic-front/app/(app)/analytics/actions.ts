'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import type { DI_RETURN_TYPES } from '@/di/types';
import type { AnalyticsQuery } from '@/src/entities/models/analytics';

/** Lo que la UI recibe de la carga: las tarjetas, o un error sin detalle (el real va al reporte de fallas). */
export type PersonalAnalyticsResult = { ok: true; cards: Awaited<ReturnType<DI_RETURN_TYPES['IGetPersonalAnalyticsController']>>['cards'] } | { ok: false };

/**
 * Las tarjetas de KPI de los Servicios personales del Usuario en un rango de días. El rango sale del browser,
 * que es quien sabe en qué zona está "hoy": por eso la carga es una acción y no parte de la página.
 */
export async function loadPersonalAnalyticsAction(query: AnalyticsQuery): Promise<PersonalAnalyticsResult> {
    try {
        const { cards } = await getInjection('IGetPersonalAnalyticsController')(query);
        return { ok: true, cards };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return { ok: false };
    }
}
