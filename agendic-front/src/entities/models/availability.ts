import { z } from 'zod';

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Una Franja como la manda y la devuelve el back: horas locales `HH:mm` en la zona de la Availability. */
export const timeRangeSchema = z.object({ start: timeSchema, end: timeSchema });
/** Franja de una Availability o de una Anulación. */
export type TimeRange = z.infer<typeof timeRangeSchema>;

/** Las Franjas de los 7 días de la semana; el índice 0 es el domingo. */
const scheduleSchema = z.array(z.array(timeRangeSchema)).length(7);

/** Una Anulación: las Franjas que reemplazan las de esa fecha en la zona de la Availability; `ranges: []` es día libre. */
export const availabilityOverrideSchema = z.object({ date: dateSchema, ranges: z.array(timeRangeSchema) });
/** Anulación de una Availability. */
export type AvailabilityOverride = z.infer<typeof availabilityOverrideSchema>;

/** Una Availability como la devuelve `GET /availabilities`. */
export const availabilitySchema = z.object({
    id: z.number(),
    name: z.string(),
    isDefault: z.boolean(),
    timeZone: z.string(),
});
/** Availability ("Horas laborables") del Usuario, sin sus Franjas. */
export type Availability = z.infer<typeof availabilitySchema>;

/** Una Availability con sus Franjas y Anulaciones, como la devuelve `GET /availabilities/:id`. */
export const availabilityDetailSchema = availabilitySchema.extend({
    schedule: scheduleSchema,
    overrides: z.array(availabilityOverrideSchema),
});
/** Availability del Usuario con sus Franjas y Anulaciones. */
export type AvailabilityDetail = z.infer<typeof availabilityDetailSchema>;

/** Lo que espera `POST /availabilities`. */
export const createAvailabilitySchema = z.object({
    name: z.string().trim().min(1),
    timeZone: z.string().min(1),
});
/** Datos para crear una Availability. */
export type CreateAvailability = z.infer<typeof createAvailabilitySchema>;

/** Lo que espera `PUT /availabilities/:id`, más el `availabilityId` que va en la ruta. Reemplaza todo, sin `id`. */
export const updateAvailabilitySchema = createAvailabilitySchema.extend({
    availabilityId: z.number().int().positive(),
    schedule: scheduleSchema,
    overrides: z.array(availabilityOverrideSchema),
});
/** Cambios a una Availability: el cuerpo entero. */
export type UpdateAvailability = z.infer<typeof updateAvailabilitySchema>;
