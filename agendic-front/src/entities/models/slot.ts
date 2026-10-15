import { z } from 'zod';
import { outOfOfficeReasonSchema } from '@/src/entities/models/out-of-office';

/**
 * Why a day has no Horarios reservables. Only present when `slots` is empty (ADR 0007): `NOT_WORKING` has no
 * Franjas or a day-off Anulación; `FULLY_BOOKED` had Horarios, but Turnos or the clock took them all;
 * `OUT_OF_OFFICE` is a Usuario Fuera de la oficina, only in a Servicio personal (ADR 0027, #236).
 */
export const NO_SLOTS_REASONS = ['NOT_WORKING', 'FULLY_BOOKED', 'OUT_OF_OFFICE'] as const;
export type NoSlotsReason = (typeof NO_SLOTS_REASONS)[number];

/** A day of Horarios reservables: `date` is a local date of the Sucursal ('YYYY-MM-DD'); `slots`, the UTC instants a Turno can start. */
export const slotDaySchema = z.object({
    date: z.iso.date(),
    slots: z.array(z.iso.datetime()),
    reason: z.enum(NO_SLOTS_REASONS).optional(),
    /** Present with `reason: OUT_OF_OFFICE`: the Motivo and, in a Día festivo, the holiday's name in `notes`. */
    outOfOffice: z.object({ reason: outOfOfficeReasonSchema, notes: z.string().nullable() }).optional(),
});
export type SlotDay = z.infer<typeof slotDaySchema>;

/**
 * The Horarios reservables of a Servicio (the union of its Empleados'), as GET /services/:id/slots returns them.
 * `timeZone` is the Sucursal's, the one the days are local to.
 */
export const slotsSchema = z.object({
    timeZone: z.string(),
    days: z.array(slotDaySchema),
});
export type Slots = z.infer<typeof slotsSchema>;

/**
 * What GET /services/:id/slots asks for: `from`/`to` are local dates of the Sucursal, inclusive. With `employeeId`,
 * only the Horarios reservables of that Empleado (Empleado elegido, ADR 0026).
 */
export interface SlotsQuery {
    serviceId: number;
    from: string;
    to: string;
    employeeId?: number;
}

/**
 * Las fechas de una Serie, como las devuelve `GET /services/:id/series-slots` (ADR 0007): a la misma hora local, cada
 * `repeatEveryWeeks` semanas. `available: false` es un choque, no un error. `employeeId` es quien atiende toda la
 * Serie; `null` en un Servicio personal.
 */
export const seriesSlotsSchema = z.object({
    employeeId: z.number().nullable(),
    dates: z.array(z.object({ date: z.iso.date(), startsAt: z.iso.datetime(), available: z.boolean() })),
});
export type SeriesSlots = z.infer<typeof seriesSlotsSchema>;

/** Lo que pide `GET /services/:id/series-slots`: el primer horario y cuántos Turnos; con `employeeId`, el Empleado elegido. */
export interface SeriesSlotsQuery {
    serviceId: number;
    startsAt: string;
    count: number;
    employeeId?: number;
}
