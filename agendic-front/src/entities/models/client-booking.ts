import { z } from 'zod';
import { BOOKING_STATUSES } from '@/src/entities/models/booking';

/** Un Turno del Cliente, como lo devuelven `GET` y los `PATCH` de `/booking-links/:secret`. */
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
    // Al revés que `business` y `branch`: solo viene en un Servicio personal, con el Enlace de reserva del Usuario.
    user: z.object({ slug: z.string() }).nullable(),
});
export type ClientBooking = z.infer<typeof clientBookingSchema>;
