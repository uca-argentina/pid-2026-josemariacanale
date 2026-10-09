import { z } from 'zod';
import { personalServiceSchema, type PersonalService } from './service';

export const userSchema = z.object({
    id: z.string(),
    email: z.email().toLowerCase(),
    name: z.string().trim().min(1),
    imageUrl: z.url().optional(),
});
export type User = z.infer<typeof userSchema>;

/** The Usuario as the back knows them (GET and PATCH /users/me): `slug` is their Enlace de reserva (ADR 0021), null until they pick one. */
export const meSchema = z.object({ name: z.string(), slug: z.string().nullable(), imageUrl: z.string().nullable() });
export type Me = z.infer<typeof meSchema>;

/** The Enlace de reserva of a Usuario, GET /u/:userSlug: their Servicios personales, without the hidden ones. */
export const userPageSchema = z.object({
    name: z.string(),
    slug: z.string(),
    services: z.array(personalServiceSchema),
});
export type UserPage = z.infer<typeof userPageSchema>;

/** The page of a Usuario's Enlace de reserva with the Servicio of its tramo, already chosen; null without that tramo. It may be hidden, and so missing from `services`. */
export type PublicUserPage = UserPage & { selectedService: PersonalService | null };
