import { z } from 'zod';

export const SERVICE_CATEGORIES = ['CLINICA', 'SPA', 'GIMNASIO', 'ACADEMIA', 'OTRO'] as const;

export const businessSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
    slug: z.string(),
    ownerId: z.union([z.number(), z.string()]),
});
export type Business = z.infer<typeof businessSchema>;

// The exact shape POST /businesses expects.
export const createBusinessSchema = z.object({
    business: z.object({ name: z.string(), description: z.string(), slug: z.string() }),
    branch: z.object({ name: z.string(), address: z.string(), opensAt: z.string(), closesAt: z.string() }),
    service: z.object({
        name: z.string(),
        category: z.enum(SERVICE_CATEGORIES),
        durationMinutes: z.number().int().min(1),
        price: z.number().min(0),
        description: z.string().optional(),
    }),
});
export type CreateBusiness = z.infer<typeof createBusinessSchema>;
