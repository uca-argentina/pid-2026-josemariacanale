import { z } from 'zod';

export const bookingStatusSchema = z.enum([
    'UNVERIFIED',
    'BOOKED',
    'CANCELLED',
    'PENDIENTE_SENA',
    'CONFIRMADO',
    'ATENDIDO',
    'NO_PRESENTADO',
    'CANCELADO',
]);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export const bookingSchema = z.object({
    id: z.number(),
    serviceId: z.number(),
    employeeId: z.number(),
    startsAt: z.string(),
    endsAt: z.string(),
    status: bookingStatusSchema,
});
export type Booking = z.infer<typeof bookingSchema>;

export const createBookingSchema = z.object({
    serviceId: z.number(),
    employeeId: z.number(),
    startsAt: z.string(),
    clientName: z.string().trim().min(1, 'El nombre es requerido'),
    clientEmail: z.string().trim().email('Email inválido'),
});
export type CreateBooking = z.infer<typeof createBookingSchema>;
