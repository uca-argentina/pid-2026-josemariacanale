// Turnos del panel. Los tipos, el formato de fechas y los filtros quedan cuando llegue el dominio de Turnos
// a src/; los datos de `mockBookings` son mock y pasan a venir de un controller.

/**
 * ponytail: el back solo tiene `BookingStatus.UNVERIFIED | BOOKED | CANCELLED` (docs/agents/domain.md).
 * `pending`, `rejected` y `no-show` (Aceptar/Rechazar turno, Ausencia) son del front hasta que el back los modele.
 */
export type BookingStatus = 'booked' | 'pending' | 'cancelled' | 'rejected' | 'no-show';

export type BookingTab = 'upcoming' | 'pending' | 'past' | 'cancelled';

export interface Booking {
    id: string;
    /** ISO 8601. */
    startsAt: string;
    /** ISO 8601. */
    endsAt: string;
    service: string;
    clientName: string;
    clientEmail: string;
    employee: string;
    branch: string;
    status: BookingStatus;
    notes?: string;
    cancelReason?: string;
    rescheduled?: boolean;
    rescheduleRequested?: boolean;
}

// ponytail: todas las Sucursales del mock están en Argentina, sin horario de verano. Con Sucursales en
// otras zonas, cada Turno formatea y arma horarios con el `Branch.timeZone` de su Sucursal.
export const TIME_ZONE = 'America/Argentina/Buenos_Aires';
export const TIME_ZONE_LABEL = 'hora de Argentina';
const UTC_OFFSET = '-03:00';

const DAY_MS = 24 * 60 * 60 * 1000;

/** El instante de `day` (`YYYY-MM-DD`) a la hora `hhmm` en la hora de la Sucursal. */
export const localInstant = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00${UTC_OFFSET}`);

export const isClosed = (b: Booking) => b.status === 'cancelled' || b.status === 'rejected';

export function tabOf(b: Booking, now: number): BookingTab {
    if (isClosed(b)) return 'cancelled';
    if (Date.parse(b.endsAt) < now) return 'past';
    return b.status === 'pending' ? 'pending' : 'upcoming';
}

/** Lo que viene, del más cercano al más lejano; lo que ya pasó, del más reciente al más viejo. */
export function sortForTab(tab: BookingTab, list: Booking[]) {
    const dir = tab === 'upcoming' || tab === 'pending' ? 1 : -1;
    return [...list].sort((a, b) => dir * (Date.parse(a.startsAt) - Date.parse(b.startsAt)));
}

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE });
/** `YYYY-MM-DD` en la hora de la Sucursal. */
export const dayKey = (at: string | number) => dayKeyFormat.format(new Date(at));

const timeFormat = new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
/** `HH:MM`, 00–23. */
export const formatTime = (at: string | number) => timeFormat.format(new Date(at));
export const formatTimeRange = (b: Booking) => `${formatTime(b.startsAt)} – ${formatTime(b.endsAt)}`;

const shortDayFormat = new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short' });
export const formatShortDay = (at: string) => shortDayFormat.format(new Date(at)).replace(/\./g, '');

const longDayFormat = new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' });
const longDateFormat = new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, dateStyle: 'full' });
export const formatLongDate = (at: string) => longDateFormat.format(new Date(at));

export function dayLabel(at: string, now: number) {
    const key = dayKey(at);
    if (key === dayKey(now)) return 'Hoy';
    if (key === dayKey(now + DAY_MS)) return 'Mañana';
    if (key === dayKey(now - DAY_MS)) return 'Ayer';
    return longDayFormat.format(new Date(at));
}

/** Agrupa por día respetando el orden de entrada. */
export function groupByDay(list: Booking[], now: number) {
    const groups: { label: string; items: Booking[] }[] = [];
    for (const b of list) {
        const label = dayLabel(b.startsAt, now);
        const last = groups.at(-1);
        if (last?.label === label) last.items.push(b);
        else groups.push({ label, items: [b] });
    }
    return groups;
}

export type ListField = 'service' | 'employee' | 'branch';
export type TextField = 'clientName' | 'clientEmail';
export type FilterField = ListField | TextField;
export type TextOp = 'is' | 'contains';

export type BookingFilter = { field: ListField; values: string[] } | { field: TextField; op: TextOp; value: string };

/** Un filtro sin valor no filtra nada. */
export function matches(b: Booking, filters: BookingFilter[]) {
    return filters.every((f) => {
        const actual = b[f.field];
        if ('values' in f) return f.values.length === 0 || f.values.includes(actual);
        const wanted = f.value.trim().toLowerCase();
        if (!wanted) return true;
        return f.op === 'is' ? actual.toLowerCase() === wanted : actual.toLowerCase().includes(wanted);
    });
}

const LUCIA = { clientName: 'Lucía Bermúdez', clientEmail: 'lucia.bermudez@gmail.com' };
const EMILIANO = { clientName: 'Emiliano Paz', clientEmail: 'emi.paz@hotmail.com' };
const CAROLINA = { clientName: 'Carolina Ruiz', clientEmail: 'caro.ruiz@gmail.com' };

/** Turnos armados alrededor de `now`, así las pestañas y los días siempre tienen contenido. */
export function mockBookings(now: number): Booking[] {
    const slot = (dayOffset: number, hhmm: string, minutes: number) => {
        const startsAt = localInstant(dayKey(now + dayOffset * DAY_MS), hhmm);
        return { startsAt: startsAt.toISOString(), endsAt: new Date(startsAt.getTime() + minutes * 60_000).toISOString() };
    };

    return [
        { id: 't1', ...slot(0, '23:00', 45), service: 'Consulta inicial de kinesiología', ...LUCIA, employee: 'Martina Fernández', branch: 'Centro', status: 'booked', notes: 'Vengo por una molestia en la rodilla derecha desde hace dos semanas, ¿tengo que llevar estudios?' },
        { id: 't2', ...slot(1, '09:00', 60), service: 'Masaje descontracturante', ...EMILIANO, employee: 'Nicolás Rivas', branch: 'Centro', status: 'booked' },
        { id: 't3', ...slot(1, '11:30', 45), service: 'Consulta inicial de kinesiología', ...CAROLINA, employee: 'Martina Fernández', branch: 'Palermo', status: 'booked', rescheduled: true },
        { id: 't4', ...slot(2, '15:00', 30), service: 'Control de seguimiento', clientName: 'Tomás Villalba', clientEmail: 'tvillalba@gmail.com', employee: 'Sofía Luna', branch: 'Centro', status: 'booked' },
        { id: 't5', ...slot(3, '08:30', 60), service: 'Masaje descontracturante', clientName: 'Rocío Alfonso', clientEmail: 'rocio.alfonso@yahoo.com', employee: 'Nicolás Rivas', branch: 'Palermo', status: 'booked', notes: 'Prefiero presión suave.' },
        { id: 't6', ...slot(5, '12:00', 30), service: 'Control de seguimiento', ...LUCIA, employee: 'Martina Fernández', branch: 'Centro', status: 'booked' },
        { id: 't7', ...slot(1, '17:00', 45), service: 'Consulta inicial de kinesiología', clientName: 'Damián Sosa', clientEmail: 'damian.sosa@gmail.com', employee: 'Martina Fernández', branch: 'Centro', status: 'pending' },
        { id: 't8', ...slot(2, '18:30', 60), service: 'Masaje descontracturante', clientName: 'Valentina Ortiz', clientEmail: 'valen.ortiz@gmail.com', employee: 'Sofía Luna', branch: 'Palermo', status: 'pending', notes: 'Es para regalar, ¿se puede pagar en el local?' },
        { id: 't9', ...slot(-1, '09:30', 45), service: 'Consulta inicial de kinesiología', clientName: 'Bruno Cabrera', clientEmail: 'bcabrera@gmail.com', employee: 'Martina Fernández', branch: 'Centro', status: 'booked' },
        { id: 't10', ...slot(-1, '11:00', 30), service: 'Control de seguimiento', clientName: 'Ailén Moreno', clientEmail: 'ailen.moreno@gmail.com', employee: 'Sofía Luna', branch: 'Centro', status: 'no-show' },
        { id: 't11', ...slot(-3, '16:00', 60), service: 'Masaje descontracturante', ...EMILIANO, employee: 'Nicolás Rivas', branch: 'Palermo', status: 'booked' },
        { id: 't12', ...slot(4, '13:00', 45), service: 'Consulta inicial de kinesiología', clientName: 'Malena Ferrari', clientEmail: 'male.ferrari@gmail.com', employee: 'Martina Fernández', branch: 'Centro', status: 'cancelled', cancelReason: 'Me surgió un viaje por trabajo.' },
        { id: 't13', ...slot(-2, '10:30', 30), service: 'Control de seguimiento', clientName: 'Gonzalo Ibáñez', clientEmail: 'gonza.ibanez@gmail.com', employee: 'Sofía Luna', branch: 'Palermo', status: 'rejected' },
    ];
}

/**
 * Lo que la página le va a pedir al controller: los Turnos y el instante en que se leyeron. La página
 * le pasa ese mismo `now` a los componentes, así el servidor y la hidratación arman las mismas pestañas.
 */
export function loadBookings() {
    const now = Date.now();
    return { now, bookings: mockBookings(now) };
}

export function loadBooking(id: string) {
    const { now, bookings } = loadBookings();
    return { now, booking: bookings.find((b) => b.id === id) };
}

export function loadPendingCount() {
    const { now, bookings } = loadBookings();
    return bookings.filter((b) => tabOf(b, now) === 'pending').length;
}
