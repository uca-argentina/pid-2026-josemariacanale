import { z } from 'zod';

export const branchSchema = z.object({
    id: z.number(),
    businessId: z.number(),
    name: z.string(),
    address: z.string(),
    opensAt: z.string(),
    closesAt: z.string(),
});
export type Branch = z.infer<typeof branchSchema>;
