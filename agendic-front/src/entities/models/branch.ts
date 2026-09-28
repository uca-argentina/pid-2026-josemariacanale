import { z } from 'zod';

// A Sucursal as GET /businesses/:businessId/branches returns it. `slug` is its tramo of the
// Enlace de reserva, unique within its Negocio (ADR 0014).
export const branchSchema = z.object({
    id: z.number(),
    businessId: z.number(),
    name: z.string(),
    address: z.string(),
    opensAt: z.string(),
    closesAt: z.string(),
    timeZone: z.string(),
    slug: z.string(),
});
export type Branch = z.infer<typeof branchSchema>;
