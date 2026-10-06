import type { Service } from './types';

// Locale y zona explícitos: sin eso el server y el cliente pueden formatear distinto.

const THOUSANDS = new Intl.NumberFormat('es-AR');

export const formatPrice = (price: number) => `$${THOUSANDS.format(price)}`;

export function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (!h) return `${m} min`;
    return m ? `${h} h ${m} min` : `${h} h`;
}

const LONG_DATE = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
});

/** 'sábado 3 de octubre' */
export const formatDate = (date: string) => LONG_DATE.format(new Date(`${date}T00:00:00Z`));

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** 'Lun', 'Mar', …, para la tira de días. */
export const shortWeekday = (date: string) => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];

/** 'YYYY-MM-DD' de hoy en esa zona horaria: el día de la Sucursal, no el del Cliente. */
export const todayIn = (timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());

/** La fecha 'YYYY-MM-DD' corrida `days` días. */
export function addDays(date: string, days: number) {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

export const toTime = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** El horario de fin de un Turno, para mostrar '10:15 a 11:00'. */
export function endTime(time: string, durationMinutes: number) {
    return toTime(toMinutes(time) + durationMinutes);
}

/** La Seña: lo que el Cliente adelanta y lo que queda para pagar en el local; `null` si el Servicio no pide. */
export function depositFor(service: Pick<Service, 'price' | 'depositPercent'>) {
    if (!service.depositPercent) return null;
    const upfront = Math.round((service.price * service.depositPercent) / 100);
    return { percent: service.depositPercent, upfront, rest: service.price - upfront };
}

/** Iniciales para el avatar, igual que en el panel. */
export function initials(name: string) {
    return name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}
