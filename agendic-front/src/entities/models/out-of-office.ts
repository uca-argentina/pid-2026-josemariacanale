import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Motivo de un período Fuera de la oficina, como lo manda el back (ADR 0027). */
export const outOfOfficeReasonSchema = z.enum(['UNSPECIFIED', 'VACATION', 'TRAVEL', 'SICK_LEAVE', 'PUBLIC_HOLIDAY']);
export type OutOfOfficeReason = z.infer<typeof outOfOfficeReasonSchema>;

/** Un período Fuera de la oficina como lo devuelve `GET /users/me/out-of-office`: fechas sin hora, inclusivas. */
export const outOfOfficeSchema = z.object({
    id: z.number(),
    startDate: dateSchema,
    endDate: dateSchema,
    reason: outOfOfficeReasonSchema,
    notes: z.string().nullable(),
    showNotePublicly: z.boolean(),
});
/** Período en que el Usuario no atiende. */
export type OutOfOffice = z.infer<typeof outOfOfficeSchema>;

/** Lo que el Usuario carga de un período: el cuerpo de `POST` y `PUT /users/me/out-of-office`. */
export const saveOutOfOfficeSchema = z.object({
    startDate: dateSchema,
    endDate: dateSchema,
    reason: outOfOfficeReasonSchema,
    notes: z.string().trim().optional(),
    showNotePublicly: z.boolean().optional(),
});
export type SaveOutOfOffice = z.infer<typeof saveOutOfOfficeSchema>;

/** Un período existente con lo que el Usuario le cambia: el `id` va en la ruta y el resto en el cuerpo. */
export const updateOutOfOfficeSchema = saveOutOfOfficeSchema.extend({ outOfOfficeId: z.number().int().positive() });
export type UpdateOutOfOffice = z.infer<typeof updateOutOfOfficeSchema>;
