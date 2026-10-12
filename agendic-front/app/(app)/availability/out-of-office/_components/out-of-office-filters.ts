import type { OutOfOffice } from '@/src/entities/models/out-of-office';
import { OUT_OF_OFFICE_REASONS } from './out-of-office-reasons';
import { toIsoDay, toLocalDay } from './out-of-office-range';

/** Los presets del Rango de Fechas, en el orden del popover, con su etiqueta. */
export const RANGE_PRESETS = {
    today: 'hoy',
    '7d': 'Últimos 7 días',
    '30d': 'Últimos 30 días',
    '90d': 'Últimos 90 días',
    mtd: 'Mes hasta la fecha',
    ytd: 'Año hasta la fecha',
    next7d: 'Próximos 7 días',
    custom: 'Rango personalizado',
} as const;
export type RangePreset = keyof typeof RANGE_PRESETS;

/** Días `YYYY-MM-DD`, inclusivos. */
export type DayRange = { from: string; to: string };

/** Los filtros de la lista de períodos. Un preset se guarda sin fechas, así sigue siendo relativo a hoy. */
export type OutOfOfficeFilters = {
    q: string;
    range: { preset: Exclude<RangePreset, 'custom'> } | ({ preset: 'custom' } & DayRange) | null;
};

/** Los parámetros de la URL que son de los filtros; el resto (`type`, `nuevo`) no se toca. */
const FILTER_PARAMS = ['q', 'rango', 'desde', 'hasta'];

const isDay = (value: string | null): value is string => value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Lee los filtros de la URL; lo que no se entiende se ignora. */
export function parseFilters(params: URLSearchParams): OutOfOfficeFilters {
    const q = params.get('q') ?? '';
    const preset = params.get('rango');
    if (preset === 'custom') {
        const from = params.get('desde');
        const to = params.get('hasta');
        return { q, range: isDay(from) && isDay(to) && from <= to ? { preset, from, to } : null };
    }
    if (preset && preset in RANGE_PRESETS) return { q, range: { preset: preset as Exclude<RangePreset, 'custom'> } };
    return { q, range: null };
}

/** Escribe los filtros sobre `params`, conservando los parámetros que no son de filtros. */
export function writeFilters(filters: OutOfOfficeFilters, params = new URLSearchParams()): URLSearchParams {
    const next = new URLSearchParams(params);
    FILTER_PARAMS.forEach((name) => next.delete(name));
    if (filters.q) next.set('q', filters.q);
    if (filters.range) {
        next.set('rango', filters.range.preset);
        if (filters.range.preset === 'custom') {
            next.set('desde', filters.range.from);
            next.set('hasta', filters.range.to);
        }
    }
    return next;
}

const addDays = (day: string, days: number) => {
    const date = toLocalDay(day);
    return toIsoDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
};

/** Los días que cubre el rango, con `today` como hoy (`YYYY-MM-DD`). */
export function resolveRange(range: NonNullable<OutOfOfficeFilters['range']>, today: string): DayRange {
    switch (range.preset) {
        case 'custom':
            return { from: range.from, to: range.to };
        case 'today':
            return { from: today, to: today };
        case '7d':
            return { from: addDays(today, -6), to: today };
        case '30d':
            return { from: addDays(today, -29), to: today };
        case '90d':
            return { from: addDays(today, -89), to: today };
        case 'mtd':
            return { from: `${today.slice(0, 8)}01`, to: today };
        case 'ytd':
            return { from: `${today.slice(0, 5)}01-01`, to: today };
        case 'next7d':
            return { from: today, to: addDays(today, 6) };
    }
}

const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * Si el período pasa los filtros: `q` busca, sin mayúsculas ni tildes, en el Motivo y en las notas; el rango deja
 * los períodos que tienen al menos un día adentro.
 */
export function matchesFilters(period: OutOfOffice, { q, range }: OutOfOfficeFilters, today: string): boolean {
    const query = normalize(q.trim());
    if (query && !normalize(`${OUT_OF_OFFICE_REASONS[period.reason].label} ${period.notes ?? ''}`).includes(query)) return false;
    if (!range) return true;
    const { from, to } = resolveRange(range, today);
    return period.startDate <= to && period.endDate >= from;
}
