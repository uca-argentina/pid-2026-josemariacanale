import { addDays } from '@/app/_components/booking/format';
import { toIsoDay, toLocalDay } from '@/app/_components/day-range';
import type { BookingsCsvQuery } from '@/src/entities/models/analytics';

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

const positiveId = (value: string | null) => (value !== null && /^[1-9]\d*$/.test(value) ? Number(value) : undefined);

/** El Servicio del filtro (`?serviceId=`); un valor que no es un entero positivo se ignora. */
export const parseServiceId = (params: URLSearchParams): number | undefined => positiveId(params.get('serviceId'));

/** Un filtro de la URL (`?serviceId=`, `?branchId=`, `?employeeId=`). */
export type FilterName = (typeof FILTER_NAMES)[number];
/** Los filtros de la URL de las analíticas del Negocio. */
export const FILTER_NAMES = ['branchId', 'serviceId', 'employeeId'] as const;

/** La URL con el filtro `name` puesto, o sacado con `undefined`, y el resto de la búsqueda intacto. */
export function filterSearch(search: string, name: FilterName, id: number | undefined): string {
    const params = new URLSearchParams(search);
    if (id === undefined) params.delete(name);
    else params.set(name, String(id));
    const next = params.toString();
    return next ? `?${next}` : '';
}

/** La URL con `serviceId` puesto, o sacado con `undefined`, y el resto de la búsqueda intacto. */
export const serviceSearch = (search: string, serviceId: number | undefined) => filterSearch(search, 'serviceId', serviceId);

/**
 * El Negocio y los filtros de la URL de las analíticas. Sin `businessId`, o con uno que no está en `businesses`, no
 * hay Negocio: las analíticas son las personales. `employeeId` solo vale para el Dueño: el back rechaza el filtro a
 * quien no lo es.
 */
export function parseBusinessFilters<B extends { id: number; isOwner: boolean }>(params: URLSearchParams, businesses: B[]) {
    const wanted = positiveId(params.get('businessId'));
    const business = businesses.find(({ id }) => id === wanted);
    return {
        business,
        branchId: positiveId(params.get('branchId')),
        serviceId: parseServiceId(params),
        employeeId: business?.isOwner ? positiveId(params.get('employeeId')) : undefined,
    };
}

/** La URL con otro Negocio elegido, o el Usuario con `undefined`: los filtros no valen en el nuevo, así que se sacan, y el rango queda. */
export function businessSearch(search: string, businessId: number | undefined): string {
    const params = new URLSearchParams(search);
    for (const name of FILTER_NAMES) params.delete(name);
    if (businessId === undefined) params.delete('businessId');
    else params.set('businessId', String(businessId));
    const next = params.toString();
    return next ? `?${next}` : '';
}

/** Lo que pide el CSV de Turnos en la página de los Servicios personales, con el estado de su URL. */
export function personalCsvQuery(params: URLSearchParams, today: string): BookingsCsvQuery {
    const { from, to } = parseRange(params, today);
    return { from, to, serviceId: parseServiceId(params) };
}

/** Lo que pide el CSV de Turnos en la página de un Negocio: el Negocio elegido y sus filtros; `undefined` si no hay Negocio. */
export function businessCsvQuery(params: URLSearchParams, today: string, businesses: { id: number; isOwner: boolean }[]): BookingsCsvQuery | undefined {
    const { from, to } = parseRange(params, today);
    const { business, ...filters } = parseBusinessFilters(params, businesses);
    return business && { businessId: business.id, from, to, ...filters };
}
