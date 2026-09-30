import { z } from 'zod';

// Why a day has no Horarios reservables. Only present when `slots` is empty (ADR 0007):
// NOT_WORKING (no Franjas, a day-off Anulación, or nothing survives the Sucursal's hours),
// FULLY_BOOKED (there were Horarios but Turnos or the clock took them all), COVERED (an Anulación
// with Cobertura: another Empleado attends that day).
export const NO_SLOTS_REASONS = ['NOT_WORKING', 'FULLY_BOOKED', 'COVERED'] as const;
export type NoSlotsReason = (typeof NO_SLOTS_REASONS)[number];

// `date` is a local date of the Sucursal ('YYYY-MM-DD'); `slots`, the UTC instants a Turno can start.
export const slotDaySchema = z.object({
    date: z.iso.date(),
    slots: z.array(z.iso.datetime()),
    reason: z.enum(NO_SLOTS_REASONS).optional(),
    coveredByEmployeeId: z.number().optional(),
});
export type SlotDay = z.infer<typeof slotDaySchema>;

// The Horarios reservables of a Servicio with an Empleado, as GET /services/:id/slots returns them.
// `timeZone` is the Sucursal's, the one the days are local to.
export const slotsSchema = z.object({
    timeZone: z.string(),
    days: z.array(slotDaySchema),
});
export type Slots = z.infer<typeof slotsSchema>;

// What GET /services/:id/slots asks for: `from`/`to` are local dates of the Sucursal, inclusive.
export interface SlotsQuery {
    serviceId: number;
    employeeId: number;
    from: string;
    to: string;
}
