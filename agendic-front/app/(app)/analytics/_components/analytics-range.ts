import { addDays } from '@/app/_components/booking/format';
import { toIsoDay, toLocalDay } from '@/app/(app)/availability/out-of-office/_components/out-of-office-range';

/** Los presets del selector de rango, con su etiqueta, en el orden del menú. */
export const RANGE_PRESETS = {
    today: 'Hoy',
    '7d': 'Últimos 7 días',
    '30d': 'Últimos 30 días',
    mtd: 'Mes a la fecha',
    ytd: 'Año a la fecha',
} as const;
export type RangePreset = keyof typeof RANGE_PRESETS;

/** El rango activo: un preset, o `custom` con días `YYYY-MM-DD` inclusivos. */
export type ActiveRange = { preset: RangePreset | 'custom'; from: string; to: string };

export const DEFAULT_PRESET: RangePreset = '30d';

/** El tope de días que acepta el back. */
const MAX_DAYS = 366;

const isDay = (value: string | null): value is string =>
    value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && toIsoDay(toLocalDay(value)) === value;

/** Los días de un preset, con `today` como hoy en la zona del browser. */
export function presetRange(preset: RangePreset, today: string): Pick<ActiveRange, 'from' | 'to'> {
    switch (preset) {
        case 'today':
            return { from: today, to: today };
        case '7d':
            return { from: addDays(today, -6), to: today };
        case '30d':
            return { from: addDays(today, -29), to: today };
        case 'mtd':
            return { from: `${today.slice(0, 8)}01`, to: today };
        case 'ytd':
            return { from: `${today.slice(0, 5)}01-01`, to: today };
    }
}

/** Lee el rango de la URL (`?range=` o `?from&to`); lo que no se entiende cae en los últimos 30 días. */
export function parseRange(params: URLSearchParams, today: string): ActiveRange {
    const preset = params.get('range');
    if (preset && Object.hasOwn(RANGE_PRESETS, preset)) {
        return { preset: preset as RangePreset, ...presetRange(preset as RangePreset, today) };
    }
    const from = params.get('from');
    const to = params.get('to');
    if (isDay(from) && isDay(to) && from <= to && addDays(from, MAX_DAYS - 1) >= to) return { preset: 'custom', from, to };
    return { preset: DEFAULT_PRESET, ...presetRange(DEFAULT_PRESET, today) };
}
