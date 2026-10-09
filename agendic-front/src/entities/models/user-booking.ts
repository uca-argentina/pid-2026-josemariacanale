import { z } from 'zod';
import { BOOKING_STATUSES } from '@/src/entities/models/booking';

/** Un Turno de Mis turnos del Usuario (ADR 0023), como lo devuelve `GET /users/me/bookings`. */
export const userBookingSchema = z.object({
    id: z.number(),
    status: z.enum(BOOKING_STATUSES),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    clientName: z.string(),
    clientEmail: z.string(),
    noShowAt: z.iso.datetime().nullable(),
    serviceId: z.number(),
    serviceName: z.string(),
    /** El Empleado del Turno; null en un Servicio personal. */
    employeeId: z.number().nullable(),
    /** Null en un Servicio personal, junto con `branch`. */
    business: z.object({ id: z.number(), name: z.string() }).nullable(),
    /** Null en un Servicio personal, junto con `business`. */
    branch: z.object({ id: z.number(), name: z.string() }).nullable(),
});
/** Turno de Mis turnos del Usuario. */
export type UserBooking = z.infer<typeof userBookingSchema>;
