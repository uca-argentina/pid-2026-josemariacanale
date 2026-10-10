import { z } from 'zod';

// A Sucursal as GET /businesses/:businessId/branches returns it. `slug` is its tramo of the
// Enlace de reserva, unique within its Negocio (ADR 0014). `description` is its own, optional one:
// without it the page shows the Negocio's.
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

// The exact shape POST /businesses/:businessId/branches expects, plus the businessId that goes in the path.
export const createBranchSchema = z.object({
    businessId: z.number(),
    name: z.string(),
    address: z.string(),
    timeZone: z.string(),
    slug: z.string(),
    description: z.string().optional(),
});
export type CreateBranch = z.infer<typeof createBranchSchema>;

// The exact shape PATCH /branches/:id expects, plus the id that goes in the path. Every field is
// optional; `description: null` removes it.
export const updateBranchSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    address: z.string().optional(),
    timeZone: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().nullable().optional(),
});
export type UpdateBranch = z.infer<typeof updateBranchSchema>;
