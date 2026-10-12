import { z } from 'zod';

/**
 * A Sucursal as GET /businesses/:businessId/branches returns it.
 *
 * `slug` is its tramo of the Enlace de reserva, unique within its Negocio (ADR 0014). `description` is its
 * own, optional one: without it the page shows the Negocio's.
 */
export const branchSchema = z.object({
    id: z.number(),
    businessId: z.number(),
    name: z.string(),
    address: z.string(),
    timeZone: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
});
export type Branch = z.infer<typeof branchSchema>;

/** How many images a Sucursal has at least and at most: it never exists without one. */
export const BRANCH_IMAGES = { min: 1, max: 5 } as const;

/**
 * What POST /businesses/:businessId/branches takes in one multipart request: the fields, the businessId that goes in
 * the path, and its first images, in order.
 */
export const createBranchSchema = branchSchema
    .pick({ name: true, address: true, timeZone: true, slug: true })
    .extend({
        businessId: z.number(),
        description: z.string().optional(),
        images: z.array(z.instanceof(File)).min(BRANCH_IMAGES.min).max(BRANCH_IMAGES.max),
    });
export type CreateBranch = z.infer<typeof createBranchSchema>;

/** The exact shape PATCH /branches/:id expects, plus the id that goes in the path. Every field is optional; `description: null` removes it. */
export const updateBranchSchema = branchSchema
    .pick({ name: true, address: true, timeZone: true, slug: true, description: true })
    .partial()
    .extend({ id: z.number() });
export type UpdateBranch = z.infer<typeof updateBranchSchema>;
