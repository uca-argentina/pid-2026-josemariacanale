import type { LeftOutsideBooking } from '@/src/entities/models/left-outside-booking';
import { dayKey, dayLabel } from './booking-format';

/** Los Turnos de un mismo día (en la hora de la Sucursal) y los textos distintos que verá el Cliente en ellos. */
export type LeftOutsideDay = { key: string; label: string; bookings: LeftOutsideBooking[]; reasons: string[] };

/** Agrupa por día respetando el orden de entrada; `now` solo decide si el día se llama "Hoy", "Mañana" o "Ayer". */
export function groupLeftOutsideByDay(bookings: LeftOutsideBooking[], now: number): LeftOutsideDay[] {
    const days: LeftOutsideDay[] = [];
    for (const booking of bookings) {
        const key = dayKey(booking.startsAt);
        let day = days.find((d) => d.key === key);
        if (!day) {
            day = { key, label: dayLabel(booking.startsAt, now), bookings: [], reasons: [] };
            days.push(day);
        }
        day.bookings.push(booking);
        if (!day.reasons.includes(booking.cancellationReason)) day.reasons.push(booking.cancellationReason);
    }
    return days;
}

/** El Motivo de cancelación que comparten todos los Turnos, o null si hay más de uno o ninguno. */
export function commonCancellationReason(bookings: LeftOutsideBooking[]): string | null {
    const [first] = bookings;
    return first && bookings.every((b) => b.cancellationReason === first.cancellationReason) ? first.cancellationReason : null;
}

/** "1 Turno" o "N Turnos". */
export const turnosCount = (count: number) => `${count} ${count === 1 ? 'Turno' : 'Turnos'}`;

/** Texto del toast al guardar: lo de hoy, más "· N Turnos cancelados" si se cancelaron. */
export function savedToast(base: string, cancelledBookings: number) {
    if (cancelledBookings <= 0) return base;
    return `${base} · ${turnosCount(cancelledBookings)} ${cancelledBookings === 1 ? 'cancelado' : 'cancelados'}`;
}
