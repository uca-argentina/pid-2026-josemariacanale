import { z } from 'zod';
import { businessSchema } from './business';
import { userPageSchema } from './user';

/**
 * Whose first tramo of an Enlace de reserva is (ADR 0026), as `GET /slugs/:slug` answers: a Negocio, in the shape of
 * `GET /businesses/by-slug/:slug`, or a Usuario, in the shape of `GET /u/:userSlug`.
 */
export const resolvedBookingLinkSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('business'), business: businessSchema }),
    z.object({ kind: z.literal('user'), user: userPageSchema }),
]);
export type ResolvedBookingLink = z.infer<typeof resolvedBookingLinkSchema>;
