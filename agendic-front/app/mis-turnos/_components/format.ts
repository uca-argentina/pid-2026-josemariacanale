// Cada Turno puede ser de una Sucursal (o Availability) distinta: la zona horaria viaja con el
// Turno (`timeZone`), así que estos formatos la reciben por parámetro en vez de fijarla.

export const formatTime = (at: string, timeZone: string) =>
    new Intl.DateTimeFormat('es-AR', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(at));

export const formatLongDate = (at: string, timeZone: string) =>
    new Intl.DateTimeFormat('es-AR', { timeZone, dateStyle: 'full' }).format(new Date(at));

const THOUSANDS = new Intl.NumberFormat('es-AR');
export const formatPrice = (price: number) => `$${THOUSANDS.format(price)}`;

export function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (!h) return `${m} min`;
    return m ? `${h} h ${m} min` : `${h} h`;
}
