import { z } from 'zod';

/** Una Anotación como la devuelve POST /services/:id/waitlist: el Servicio y la fecha ('YYYY-MM-DD') de la Sucursal. */
export const waitlistEntrySchema = z.object({
    serviceId: z.number(),
    date: z.iso.date(),
});
export type WaitlistEntry = z.infer<typeof waitlistEntrySchema>;

/**
 * El body de POST /services/:id/waitlist. El Cliente no tiene cuenta: sus datos viajan en la Anotación, con el
 * Código de verificación ya pedido para `clientEmail`.
 */
export const joinWaitlistSchema = waitlistEntrySchema.extend({
    clientName: z.string(),
    clientEmail: z.string(),
    code: z.string(),
});
export type JoinWaitlist = z.infer<typeof joinWaitlistSchema>;

/**
 * Una Anotación como la devuelve GET /waitlist-links/:secret: lo que la página de Salir de la Lista de espera muestra.
 * `business` y `branch` son `null` en un Servicio personal y `user` es `null` en uno del Negocio, como en `ClientBooking`.
 */
export const waitlistEntryViewSchema = z.object({
    date: z.iso.date(),
    timeZone: z.string(),
    left: z.boolean(),
    service: z.object({ name: z.string(), slug: z.string() }),
    business: z.object({ name: z.string(), slug: z.string() }).nullable(),
    branch: z.object({ name: z.string(), slug: z.string() }).nullable(),
    user: z.object({ slug: z.string() }).nullable(),
});
export type WaitlistEntryView = z.infer<typeof waitlistEntryViewSchema>;
