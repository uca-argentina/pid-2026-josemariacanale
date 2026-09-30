import { z } from 'zod';

// UNVERIFIED: the Cliente has not verified their email yet (Turno sin verificar). PENDING: verified,
// waiting for the Negocio to accept it (Turno pendiente). BOOKED: accepted.
export const BOOKING_STATUSES = ['UNVERIFIED', 'PENDING', 'BOOKED', 'REJECTED', 'CANCELLED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// A Turno as POST /bookings returns it. `notes` is the Comentario del Turno: null when the Cliente
// left none, absent while the back does not return it yet.
export const bookingSchema = z.object({
    id: z.number(),
    serviceId: z.number(),
    employeeId: z.number(),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    status: z.enum(BOOKING_STATUSES),
    notes: z.string().nullable().optional(),
});
export type Booking = z.infer<typeof bookingSchema>;

// The body of POST /bookings. The Cliente has no account (ADR 0005): their data travels in the Turno.
export const createBookingSchema = bookingSchema.pick({ serviceId: true, employeeId: true, startsAt: true }).extend({
    clientName: z.string(),
    clientEmail: z.string(),
    notes: z.string().optional(),
});
export type CreateBooking = z.infer<typeof createBookingSchema>;
