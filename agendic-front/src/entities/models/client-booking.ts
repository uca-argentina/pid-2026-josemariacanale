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
    // Empleado elegido (ADR 0026): Reagendar solo ofrece horarios de `employeeId`.
    employeeChosen: z.boolean(),
    // La Seña, fija desde que se Reservó (null sin Seña), y cuándo se pagó (null mientras no).
    depositAmount: z.number().nullable(),
    depositPaidAt: z.iso.datetime().nullable(),
    // Ausencia del Anfitrión: cuándo el Cliente avisó que quien lo atiende no vino (null mientras no), y si todavía puede avisarlo (lo calcula el back).
    employeeNoShowAt: z.iso.datetime().nullable(),
    canMarkEmployeeNoShow: z.boolean(),
    // Calificación del Cliente (null mientras no califica) y si todavía puede calificar (lo calcula el back).
    rating: z.object({ score: z.number(), comment: z.string().nullable(), createdAt: z.iso.datetime() }).nullable(),
    canRate: z.boolean(),
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
    user: z.object({ slug: z.string().nullable() }).nullable(),
});
export type ClientBooking = z.infer<typeof clientBookingSchema>;
