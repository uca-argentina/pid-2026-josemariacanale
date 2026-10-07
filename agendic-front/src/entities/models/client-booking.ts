import { z } from 'zod';
import { BOOKING_STATUSES } from '@/src/entities/models/booking';

/** El acceso a Mis turnos (ADR 0022): 15 minutos, atado al email, sin cookie ni Sesión. */
export const clientAccessSchema = z.object({ access: z.string(), expiresAt: z.iso.datetime() });
export type ClientAccess = z.infer<typeof clientAccessSchema>;

/** Un Turno de Mis turnos del Cliente, como lo devuelve `GET /client/bookings`. */
export const clientBookingSchema = z.object({
    id: z.number(),
    status: z.enum(BOOKING_STATUSES),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    timeZone: z.string(),
    notes: z.string().nullable(),
    clientName: z.string(),
    serviceId: z.number(),
    employeeId: z.number().nullable(),
    service: z.object({
        name: z.string(),
        durationMinutes: z.number(),
        price: z.number(),
        depositPercent: z.number().nullable(),
    }),
    employeeName: z.string(),
    // Null en un Servicio personal, que no tiene Negocio ni Sucursal.
    business: z.object({ name: z.string(), slug: z.string() }).nullable(),
    branch: z
        .object({ name: z.string(), slug: z.string(), address: z.string(), coverUrl: z.string().nullable() })
        .nullable(),
});
export type ClientBooking = z.infer<typeof clientBookingSchema>;
