import { z } from 'zod';
import { BOOKING_STATUSES } from '@/src/entities/models/booking';

/** Un Turno de "mis turnos del Empleado", como lo devuelve `GET /employees/me/bookings`. */
export const employeeBookingSchema = z.object({
    id: z.number(),
    status: z.enum(BOOKING_STATUSES),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    clientName: z.string(),
    clientEmail: z.string(),
    noShowAt: z.iso.datetime().nullable(),
    serviceId: z.number(),
    serviceName: z.string(),
    /** El Empleado del Turno; el back todavía no lo devuelve, hace falta para pedir los Horarios reservables al Reagendar. */
    employeeId: z.number().optional(),
    businessId: z.number(),
    businessName: z.string(),
    branchId: z.number(),
    branchName: z.string(),
});
/** Turno de "mis turnos del Empleado". */
export type EmployeeBooking = z.infer<typeof employeeBookingSchema>;
