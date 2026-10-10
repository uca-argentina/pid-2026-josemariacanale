import { z } from 'zod';

export const SERVICE_CATEGORIES = ['CLINICA', 'SPA', 'GIMNASIO', 'ACADEMIA', 'OTRO'] as const;

/**
 * A tramo of the Enlace de reserva, of a Negocio or of a Sucursal: the back's IsSlug rule. The back compares it in
 * lowercase, so it is lowercased before checking.
 */
export const slugSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

/** A Negocio as the back returns it. `logoUrl` is the Logo del Negocio in the external storage (ADR 0015), null without one. */
export const businessSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
    slug: z.string(),
    logoUrl: z.string().nullable(),
    ownerId: z.union([z.number(), z.string()]),
});
export type Business = z.infer<typeof businessSchema>;

/** The exact shape POST /businesses expects. */
export const createBusinessSchema = z.object({
    business: z.object({ name: z.string(), description: z.string(), slug: z.string() }),
    branch: z.object({ name: z.string(), address: z.string(), timeZone: z.string() }),
    service: z.object({
        name: z.string(),
        slug: z.string(),
        category: z.enum(SERVICE_CATEGORIES),
        durationMinutes: z.number().int().min(1),
        price: z.number().min(0),
        description: z.string().optional(),
    }),
});
export type CreateBusiness = z.infer<typeof createBusinessSchema>;

/** The exact shape PATCH /businesses/:id expects, plus the id that goes in the path. */
export const updateBusinessSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
    slug: z.string(),
});
export type UpdateBusiness = z.infer<typeof updateBusinessSchema>;

/** Input del controller de subir el Logo del Negocio: el Negocio y el archivo. */
export const uploadBusinessLogoSchema = z.object({ businessId: z.number(), file: z.instanceof(File) });
/** Input del controller de quitar el Logo del Negocio. */
export const deleteBusinessLogoSchema = z.object({ businessId: z.number() });
