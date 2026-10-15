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
