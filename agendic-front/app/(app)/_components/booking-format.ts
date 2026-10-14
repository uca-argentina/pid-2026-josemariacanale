import type { Preferences } from '@/src/entities/models/user';

/**
 * ponytail: todas las Sucursales están en Argentina, sin horario de verano. Con Sucursales en otras zonas,
 * cada Turno formatea y arma horarios con el `Branch.timeZone` de su Sucursal.
 */
export const TIME_ZONE = 'America/Argentina/Buenos_Aires';
/** Cómo se rotula la zona horaria en pantalla. */
export const TIME_ZONE_LABEL = 'hora de Argentina';
const UTC_OFFSET = '-03:00';

const DAY_MS = 24 * 60 * 60 * 1000;

/** El instante de `day` (`YYYY-MM-DD`) a la hora `hhmm` en la hora de la Sucursal. */
export const localInstant = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00${UTC_OFFSET}`);

/** Dónde pasa el Turno: "Negocio · Sucursal", o "Servicio personal" si no tiene Negocio. Sirve a cualquier objeto con `business` y `branch`. */
export const placeOf = (b: { business: { name: string } | null; branch: { name: string } | null }) =>
    b.business && b.branch ? `${b.business.name} · ${b.branch.name}` : 'Servicio personal';

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE });
/** `YYYY-MM-DD` en la hora de la Sucursal. */
export const dayKey = (at: string | number) => dayKeyFormat.format(new Date(at));

const timeFormats = {
    24: new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
    12: new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', hourCycle: 'h12' }),
};
/** `HH:MM` (24) o `h:MM a. m.` (12), según las Preferencias del Usuario; sin ellas, 24. */
export const formatTime = (at: string | number, timeFormat: Preferences['timeFormat'] = 24) =>
    timeFormats[timeFormat].format(new Date(at)).replace(/[  ]/g, ' ');
/** `HH:MM – HH:MM` del Turno. */
export const formatTimeRange = (b: { startsAt: string; endsAt: string }, timeFormat?: Preferences['timeFormat']) =>
    `${formatTime(b.startsAt, timeFormat)} – ${formatTime(b.endsAt, timeFormat)}`;

const shortDayFormat = new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short' });
/** Día corto, ej. `mar 15 sep`. */
export const formatShortDay = (at: string) => shortDayFormat.format(new Date(at)).replace(/\./g, '');

const longDayFormat = new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' });
const longDateFormat = new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, dateStyle: 'full' });
/** Fecha completa, ej. `martes, 15 de septiembre de 2026`. */
export const formatLongDate = (at: string) => longDateFormat.format(new Date(at));

/** `Hoy`, `Mañana`, `Ayer` o el día largo. */
export function dayLabel(at: string, now: number) {
    const key = dayKey(at);
    if (key === dayKey(now)) return 'Hoy';
    if (key === dayKey(now + DAY_MS)) return 'Mañana';
    if (key === dayKey(now - DAY_MS)) return 'Ayer';
    return longDayFormat.format(new Date(at));
}
