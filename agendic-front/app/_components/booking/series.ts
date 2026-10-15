import type { Step } from './types';

/** Los Turnos mínimos de una Serie (ADR 0007): con menos, el back responde 422. */
export const SERIES_MIN_BOOKINGS = 2;

/** Una fecha de la Serie como la muestra el paso Fechas. */
export interface SeriesDate {
    date: string;
    startsAt: string;
    available: boolean;
}

/** Los pasos de la reserva: con una Serie (ADR 0007), Fechas va entre Horario y Confirmar. */
export function stepsFor(repeatCount: number | null): Step[] {
    return repeatCount === null ? ['service', 'time', 'confirm'] : ['service', 'time', 'dates', 'confirm'];
}

/** Las cantidades de Turnos que se pueden elegir para la Serie: de 2 al máximo de la Repetición del Servicio. */
export function countOptions(maxBookings: number): number[] {
    return Array.from({ length: Math.max(0, maxBookings - SERIES_MIN_BOOKINGS + 1) }, (_, i) => i + SERIES_MIN_BOOKINGS);
}

/** Las fechas de la Serie a mostrar: las que marcó el back y las del 409 (`conflicts`) quedan como no disponibles. */
export function seriesDatesView(dates: SeriesDate[], conflicts: string[]): SeriesDate[] {
    const clashing = new Set(conflicts);
    return dates.map((d) => ({ ...d, available: d.available && !clashing.has(d.date) }));
}

/**
 * Qué fechas se saltean al "Seguir sin esas fechas" y cuántos Turnos quedan. Son exactamente las que el paso Fechas
 * muestra como no disponibles: nunca se saltea una que el Cliente no vio.
 */
export function skippedDates(view: SeriesDate[]): { skip: string[]; remaining: number } {
    const skip = view.filter((d) => !d.available).map((d) => d.date);
    return { skip, remaining: view.length - skip.length };
}

/**
 * Las fechas que chocan después de un nuevo 409: se suman a las anteriores, porque el reintento ya las salteaba y sin
 * ellas volverían a entrar en la Serie.
 */
export function mergeConflicts(previous: string[], next: string[]): string[] {
    return [...new Set([...previous, ...next])];
}

/** Cada cuánto se repite la Serie, para "Repetir …" y el resumen. */
export function everyWeeksLabel(everyWeeks: number): string {
    return everyWeeks === 1 ? 'todas las semanas' : `cada ${everyWeeks} semanas`;
}
