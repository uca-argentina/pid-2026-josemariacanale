import { z } from 'zod';

/** Qué pasó en una entrada del Historial del Turno (ADR 0033). */
export const BOOKING_HISTORY_TYPES = ['booked', 'accepted', 'rejected', 'cancelled', 'rescheduled', 'noShow', 'employeeNoShow', 'depositPaid', 'rated'] as const;
/** Uno de los `BOOKING_HISTORY_TYPES`. */
export type BookingHistoryType = (typeof BOOKING_HISTORY_TYPES)[number];

/** Quién hizo una entrada del Historial del Turno; `retirement` es una baja de Servicio, Empleado o Usuario. */
export const BOOKING_HISTORY_ACTORS = ['employee', 'client', 'retirement'] as const;
/** Uno de los `BOOKING_HISTORY_ACTORS`. */
export type BookingHistoryActor = (typeof BOOKING_HISTORY_ACTORS)[number];

/**
 * Una entrada del Historial del Turno, como la devuelve `GET /bookings/:id/history`. `reason` es el Motivo de
 * cancelación; `from` es el horario de antes, solo en `rescheduled`.
 */
export const bookingHistoryEntrySchema = z.object({
    type: z.enum(BOOKING_HISTORY_TYPES),
    at: z.iso.datetime(),
    actor: z.enum(BOOKING_HISTORY_ACTORS).nullable(),
    reason: z.string().nullable(),
    from: z.object({ startsAt: z.iso.datetime(), endsAt: z.iso.datetime() }).nullable(),
});
/** Una entrada del Historial del Turno, ya validada. */
export type BookingHistoryEntry = z.infer<typeof bookingHistoryEntrySchema>;

/** La respuesta de `GET /bookings/:id/history`: las entradas, en orden. */
export const bookingHistorySchema = z.object({ entries: z.array(bookingHistoryEntrySchema) });
