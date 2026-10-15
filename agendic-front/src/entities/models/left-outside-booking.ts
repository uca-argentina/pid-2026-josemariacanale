import { z } from 'zod';

/** Por qué un cambio en el horario del Usuario deja afuera un Turno (ADR 0034). */
export const cancellationCauseSchema = z.enum(['OUT_OF_OFFICE', 'PUBLIC_HOLIDAY', 'SCHEDULE_CHANGE']);
export type CancellationCause = z.infer<typeof cancellationCauseSchema>;

/**
 * Un Turno pendiente o aceptado que un cambio en el horario del Usuario deja afuera, como lo devuelven las
 * vistas previas del back. `cancellationReason` es el Motivo de cancelación que va a ver el Cliente.
 */
export const leftOutsideBookingSchema = z.object({
    id: z.number(),
    startsAt: z.string(),
    endsAt: z.string(),
    timeZone: z.string(),
    serviceName: z.string(),
    clientName: z.string(),
    business: z.object({ id: z.number(), name: z.string() }).nullable(),
    branch: z.object({ id: z.number(), name: z.string() }).nullable(),
    cancellationCause: cancellationCauseSchema,
    cancellationReason: z.string(),
});
export type LeftOutsideBooking = z.infer<typeof leftOutsideBookingSchema>;

/** Los ids de los Turnos que el Usuario confirmó cancelar. */
export const cancelBookingIdsSchema = z.array(z.number().int().positive());

/** Lo que responde una escritura que cancela Turnos: cuántos canceló. */
export const cancelledBookingsSchema = z.object({ cancelledBookings: z.number().int().nonnegative() });
export type CancelledBookings = z.infer<typeof cancelledBookingsSchema>;
