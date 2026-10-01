import { z } from 'zod';

/** Una Franja de una Anulación: horas locales `HH:mm`, sin día de la semana porque vale para una fecha. */
export const overrideIntervalSchema = z.object({
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
});
/** Franja de una Anulación. */
export type OverrideInterval = z.infer<typeof overrideIntervalSchema>;

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Una Anulación como la devuelve el back. El listado trae solo `date` e `intervals`; el `PUT` suma
 * `coveredByEmployeeId`. `intervals: []` es día libre.
 */
export const overrideSchema = z.object({
    date: dateSchema,
    intervals: z.array(overrideIntervalSchema),
    coveredByEmployeeId: z.number().nullish(),
});
/** Anulación de un Empleado para una fecha. */
export type Override = z.infer<typeof overrideSchema>;

/** Lo que espera `PUT /employees/:id/overrides/:date`, más el `employeeId` y la `date` que van en la ruta. */
export const setOverrideSchema = z.object({
    employeeId: z.number().int().positive(),
    date: dateSchema,
    intervals: z.array(overrideIntervalSchema),
    coveredByEmployeeId: z.number().int().positive().optional(),
});
/** Datos para anular una fecha. */
export type SetOverride = z.infer<typeof setOverrideSchema>;

/** Anular varias fechas con las mismas Franjas y la misma Cobertura. */
export const setOverridesSchema = setOverrideSchema.omit({ date: true }).extend({
    dates: z.array(dateSchema).min(1),
});

/** Lo que se necesita para sacar una Anulación. */
export const removeOverrideSchema = z.object({
    employeeId: z.number().int().positive(),
    date: dateSchema,
});
