import { isDay, type DayRange } from '@/app/_components/day-range';
import type { BookingFilter, BookingTab, TextField, TextOp } from './booking-helpers';

/** Cómo se ven los Turnos: lista o calendario semanal. */
export type BookingsView = 'list' | 'calendar';

/**
 * Lo que Mis turnos guarda en la URL: la pestaña, los filtros, el rango de fechas, la vista y la semana
 * (su primer día; `null` es la actual) y el Turno abierto en el panel lateral (`?turno=<id>`).
 */
export type BookingsUrlState = { tab: BookingTab; filters: BookingFilter[]; range: DayRange | null; view: BookingsView; week: string | null; turno: number | null };

const TABS: BookingTab[] = ['upcoming', 'pending', 'series', 'past', 'cancelled'];
const LIST_FIELDS = ['service', 'branch'] as const;
const TEXT_FIELDS: TextField[] = ['clientName', 'clientEmail'];

/** Los parámetros de la URL que son de Mis turnos; el resto no se toca. */
const OWN_PARAMS: string[] = ['tab', 'view', 'week', 'turno', 'desde', 'hasta', ...LIST_FIELDS, ...TEXT_FIELDS, ...TEXT_FIELDS.map((field) => `${field}Op`)];

/**
 * Lee la pestaña, los filtros, el rango, la vista y la semana de la URL. Lo que no se entiende se ignora: una pestaña inválida es
 * Próximos, un operador inválido es "es", y un rango con una fecha inválida o al revés no es rango.
 */
export function parseBookingsUrl(params: URLSearchParams): BookingsUrlState {
    const tab = params.get('tab');
    const filters: BookingFilter[] = [];
    for (const field of LIST_FIELDS) {
        const values = params.getAll(field).filter(Boolean);
        if (values.length > 0) filters.push({ field, values });
    }
    for (const field of TEXT_FIELDS) {
        const value = params.get(field);
        if (!value?.trim()) continue;
        const op: TextOp = params.get(`${field}Op`) === 'contains' ? 'contains' : 'is';
        filters.push({ field, op, value });
    }
    const from = params.get('desde');
    const to = params.get('hasta');
    const week = params.get('week');
    const turno = Number(params.get('turno'));
    return {
        tab: TABS.find((id) => id === tab) ?? 'upcoming',
        filters,
        range: isDay(from) && isDay(to) && from <= to ? { from, to } : null,
        view: params.get('view') === 'calendar' ? 'calendar' : 'list',
        week: isDay(week) ? week : null,
        turno: Number.isInteger(turno) && turno > 0 ? turno : null,
    };
}

/** Escribe el estado sobre `params`, conservando los parámetros ajenos; los valores por defecto no se escriben. */
export function writeBookingsUrl({ tab, filters, range, view, week, turno }: BookingsUrlState, params = new URLSearchParams()): URLSearchParams {
    const next = new URLSearchParams(params);
    OWN_PARAMS.forEach((name) => next.delete(name));
    if (tab !== 'upcoming') next.set('tab', tab);
    for (const filter of filters) {
        if ('values' in filter) filter.values.forEach((value) => next.append(filter.field, value));
        else if (filter.value.trim()) {
            next.set(filter.field, filter.value);
            if (filter.op === 'contains') next.set(`${filter.field}Op`, filter.op);
        }
    }
    if (view === 'calendar') {
        next.set('view', view);
        if (week) next.set('week', week);
    }
    if (turno !== null) next.set('turno', String(turno));
    if (range) {
        next.set('desde', range.from);
        next.set('hasta', range.to);
    }
    return next;
}
