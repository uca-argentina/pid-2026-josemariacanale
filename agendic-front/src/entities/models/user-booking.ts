import { z } from 'zod';
import { BOOKING_STATUSES } from '@/src/entities/models/booking';

/** Quién Canceló o Rechazó un Turno (ADR 0033). */
export const BOOKING_ACTORS = ['EMPLOYEE', 'CLIENT', 'RETIREMENT'] as const;
export type BookingActor = (typeof BOOKING_ACTORS)[number];

/** Qué cambio en el horario de quien atiende canceló un Turno (ADR 0034). */
export const CANCELLATION_CAUSES = ['OUT_OF_OFFICE', 'PUBLIC_HOLIDAY', 'SCHEDULE_CHANGE'] as const;
export type CancellationCause = (typeof CANCELLATION_CAUSES)[number];

/** Un Turno de Mis turnos del Usuario (ADR 0023), como lo devuelve `GET /users/me/bookings`. */
export const userBookingSchema = z.object({
    id: z.number(),
    status: z.enum(BOOKING_STATUSES),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    clientName: z.string(),
    clientEmail: z.string(),
    noShowAt: z.iso.datetime().nullable(),
    /** Falta del Empleado: cuándo el Cliente avisó que no vino; null si no. */
    employeeNoShowAt: z.iso.datetime().nullable(),
    serviceId: z.number(),
    serviceName: z.string(),
    /** El Empleado del Turno; null en un Servicio personal. */
    employeeId: z.number().nullable(),
    /** Empleado elegido (ADR 0026): Reagendar solo ofrece horarios de `employeeId`. */
    employeeChosen: z.boolean(),
    /** La Seña, fija desde que se Reservó; null si el Turno no tiene Seña. */
    depositAmount: z.number().nullable(),
    /** Cuándo se pagó la Seña; null mientras no se paga. */
    depositPaidAt: z.iso.datetime().nullable(),
    /** El Turno que este Reagendó (ADR 0031); null si no viene de un Reagendamiento. */
    fromRescheduleId: z.number().nullable(),
    /** Quién Canceló o Rechazó el Turno; null si no lo está, o si se canceló antes de que se guardara. */
    cancelledBy: z.enum(BOOKING_ACTORS).nullable(),
    /** El Motivo de cancelación que dejó quien Canceló o Rechazó; null si no hay. */
    cancellationReason: z.string().nullable(),
    /** La Causa de cancelación (ADR 0034): solo en un Turno que canceló un cambio en el horario de quien lo atiende. */
    cancellationCause: z.enum(CANCELLATION_CAUSES).nullable(),
    /** Null en un Servicio personal, junto con `branch`. */
    business: z.object({ id: z.number(), name: z.string() }).nullable(),
    /** Null en un Servicio personal, junto con `business`. */
    branch: z.object({ id: z.number(), name: z.string() }).nullable(),
    /** La Cabina que ocupa el Turno (ADR 0030), aunque esté dada de baja; null si no ocupa ninguna. */
    cabin: z.object({ id: z.number(), name: z.string() }).nullable(),
});
/** Turno de Mis turnos del Usuario. */
export type UserBooking = z.infer<typeof userBookingSchema>;
