import { z } from 'zod';

// PENDING: waiting for the Negocio to accept it (Turno pendiente). BOOKED: accepted. The Turno is
// born verified (ADR 0022): there is no unverified state.
export const BOOKING_STATUSES = ['PENDING', 'BOOKED', 'REJECTED', 'CANCELLED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// A Turno as POST /bookings returns it. `notes` is the Comentario del Turno: null when the Cliente
// left none, absent while the back does not return it yet.
export const bookingSchema = z.object({
    id: z.number(),
    serviceId: z.number(),
    employeeId: z.number().nullable(),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    status: z.enum(BOOKING_STATUSES),
    notes: z.string().nullable().optional(),
    // Only POST /bookings returns it: the Empleado the back assigned (a Cliente does not choose one).
    employeeName: z.string().optional(),
    // Only POST /bookings returns these: the acceso a Mis turnos recién abierto (ADR 0022).
    access: z.string().optional(),
    accessExpiresAt: z.iso.datetime().optional(),
});
export type Booking = z.infer<typeof bookingSchema>;

// The body of POST /bookings. The Cliente has no account (ADR 0005): their data travels in the Turno.
// `code` is the Código de verificación already requested for clientEmail (ADR 0022).
export const createBookingSchema = bookingSchema.pick({ serviceId: true, startsAt: true }).extend({
    clientName: z.string(),
    clientEmail: z.string(),
    notes: z.string().optional(),
    code: z.string(),
});
export type CreateBooking = z.infer<typeof createBookingSchema>;
