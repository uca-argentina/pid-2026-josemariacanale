import { z } from 'zod';

/** Una Franja como la manda y la devuelve el back: `weekday` 0 = domingo, horas locales `HH:mm`. */
export const availabilityIntervalSchema = z.object({
    weekday: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
});
/** Franja de una Availability. */
export type AvailabilityInterval = z.infer<typeof availabilityIntervalSchema>;

/** Una Availability de un Empleado, como la devuelve `GET /employees/:id/availabilities`. */
export const availabilitySchema = z.object({
    id: z.number(),
    employeeId: z.number(),
    name: z.string(),
    isDefault: z.boolean(),
    intervals: z.array(availabilityIntervalSchema),
});
/** Availability ("Horas laborables") de un Empleado. */
export type Availability = z.infer<typeof availabilitySchema>;

/** Lo que espera `POST /employees/:id/availabilities`, más el `employeeId` que va en la ruta. */
export const createAvailabilitySchema = z.object({
    employeeId: z.number().int().positive(),
    name: z.string().trim().min(1),
    intervals: z.array(availabilityIntervalSchema),
});
/** Datos para crear una Availability. */
export type CreateAvailability = z.infer<typeof createAvailabilitySchema>;

/** Lo que espera `PATCH /availabilities/:id`, más el `availabilityId` que va en la ruta. `intervals` reemplaza el set entero. */
export const updateAvailabilitySchema = z.object({
    availabilityId: z.number().int().positive(),
    name: z.string().trim().min(1).optional(),
    intervals: z.array(availabilityIntervalSchema).optional(),
});
/** Cambios a una Availability. */
export type UpdateAvailability = z.infer<typeof updateAvailabilitySchema>;
