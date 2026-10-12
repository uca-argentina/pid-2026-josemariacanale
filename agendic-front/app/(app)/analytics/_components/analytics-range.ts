import { addDays } from '@/app/_components/booking/format';
import { toIsoDay, toLocalDay } from '@/app/_components/day-range';

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

/** El rango que se usa sin URL, o con una que no se entiende. */
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

/** Si `from`..`to` es un rango personalizado que el back acepta: días que existen, en orden y de hasta 366 días. */
export const isValidCustomRange = (from: string | null, to: string | null): boolean =>
    isDay(from) && isDay(to) && from <= to && addDays(from, MAX_DAYS - 1) >= to;

/** Lee el rango de la URL (`?range=` o `?from&to`); lo que no se entiende cae en los últimos 30 días. */
export function parseRange(params: URLSearchParams, today: string): ActiveRange {
    const preset = params.get('range');
    if (preset && Object.hasOwn(RANGE_PRESETS, preset)) {
        return { preset: preset as RangePreset, ...presetRange(preset as RangePreset, today) };
    }
    const from = params.get('from');
    const to = params.get('to');
    if (isValidCustomRange(from, to) && from && to) return { preset: 'custom', from, to };
    return { preset: DEFAULT_PRESET, ...presetRange(DEFAULT_PRESET, today) };
}

/** Un cambio de rango del selector: un preset, o días elegidos en el Calendar. */
export type RangeChange = { preset: RangePreset } | { preset: 'custom'; from: string; to: string };

/** La URL de un rango, la inversa de `parseRange`; el rango por defecto no lleva nada. */
export const rangeSearch = (change: RangeChange) =>
    change.preset === 'custom' ? `?from=${change.from}&to=${change.to}` : change.preset === DEFAULT_PRESET ? '' : `?range=${change.preset}`;

/** El Servicio del filtro (`?serviceId=`); un valor que no es un entero positivo se ignora. */
export function parseServiceId(params: URLSearchParams): number | undefined {
    const value = params.get('serviceId');
    return value !== null && /^[1-9]\d*$/.test(value) ? Number(value) : undefined;
}

/** La URL con `serviceId` puesto, o sacado con `undefined`, y el resto de la búsqueda intacto. */
export function serviceSearch(search: string, serviceId: number | undefined): string {
    const params = new URLSearchParams(search);
    if (serviceId === undefined) params.delete('serviceId');
    else params.set('serviceId', String(serviceId));
    const next = params.toString();
    return next ? `?${next}` : '';
}
