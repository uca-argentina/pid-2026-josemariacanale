'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { isSessionExpired } from '@/app/api-error';
import { SIGN_IN_PATH } from '@/app/routes';
import { getInjection } from '@/di/container';
import type { DI_RETURN_TYPES } from '@/di/types';
import { UnauthorizedError } from '@/src/entities/errors/auth';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import type { AnalyticsQuery, BookingsCsvQuery, BusinessAnalyticsQuery, CsvFile, EmployeesPerPeriodQuery } from '@/src/entities/models/analytics';

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

/** Lo que presenta el controller de un Negocio: lo de las analíticas personales, más filtros y, para el Dueño, rankings. */
export type BusinessAnalyticsData = Awaited<ReturnType<DI_RETURN_TYPES['IGetBusinessAnalyticsController']>>;

/** Por qué no hay datos: sin permiso o sin Negocio (el selector sigue para elegir otro), o una falla sin detalle. */
export type BusinessAnalyticsResult = { ok: true; data: BusinessAnalyticsData } | { ok: false; reason: 'forbidden' | 'notFound' | 'error' };

/** Las analíticas de un Negocio en un rango de días y con los filtros que lleve; por qué es una acción, ver `loadPersonalAnalyticsAction`. */
export async function loadBusinessAnalyticsAction(query: BusinessAnalyticsQuery): Promise<BusinessAnalyticsResult> {
    try {
        return { ok: true, data: await getInjection('IGetBusinessAnalyticsController')(query) };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof UnauthorizedError) return { ok: false, reason: 'forbidden' };
        if (error instanceof NotFoundError) return { ok: false, reason: 'notFound' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, reason: 'error' };
    }
}

/** Lo que presenta el controller de la tabla "Turnos por Empleado y período": los buckets ya rotulados y una fila por Empleado. */
export type EmployeesPerPeriodData = Awaited<ReturnType<DI_RETURN_TYPES['IGetEmployeesPerPeriodController']>>;

/** Los datos de la tabla, o un error sin detalle (el real va al reporte de fallas). */
export type EmployeesPerPeriodResult = { ok: true; data: EmployeesPerPeriodData } | { ok: false };

/** La tabla "Turnos por Empleado y período" del Dueño; por qué es una acción, ver `loadPersonalAnalyticsAction`. */
export async function loadEmployeesPerPeriodAction(query: EmployeesPerPeriodQuery): Promise<EmployeesPerPeriodResult> {
    try {
        return { ok: true, data: await getInjection('IGetEmployeesPerPeriodController')(query) };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        getInjection('ICrashReporterService').report(error);
        return { ok: false };
    }
}

/** El archivo a bajar, o por qué no se pudo, ya en palabras para el toast. */
export type DownloadBookingsCsvResult = { ok: true; file: CsvFile } | { ok: false; message: string };

/** El CSV de Turnos del rango y los filtros de la página; por qué es una acción, ver `loadPersonalAnalyticsAction`. */
export async function downloadBookingsCsvAction(query: BookingsCsvQuery): Promise<DownloadBookingsCsvResult> {
    try {
        return { ok: true, file: await getInjection('IDownloadBookingsCsvController')(query) };
    } catch (error) {
        unstable_rethrow(error);
        if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
        if (error instanceof UnauthorizedError) return { ok: false, message: 'Solo los Empleados de este Negocio pueden descargar sus Turnos.' };
        if (error instanceof NotFoundError) return { ok: false, message: 'No encontramos el Negocio o algo de lo que filtraste.' };
        if (error instanceof InputParseError) return { ok: false, message: 'El rango no es válido.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos descargar los Turnos. Intentá de nuevo.' };
    }
}
