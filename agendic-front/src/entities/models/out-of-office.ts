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
