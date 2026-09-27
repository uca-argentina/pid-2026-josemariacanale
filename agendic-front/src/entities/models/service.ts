import { z } from 'zod';
import { SERVICE_CATEGORIES } from './business';

export const serviceEmployeeSchema = z.object({
    id: z.number(),
    name: z.string(),
});
export type ServiceEmployee = z.infer<typeof serviceEmployeeSchema>;

export const serviceSchema = z.object({
    id: z.number(),
    branchId: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    category: z.enum(SERVICE_CATEGORIES),
    durationMinutes: z.number(),
    price: z.number(),
    employees: z.array(serviceEmployeeSchema),
});
export type Service = z.infer<typeof serviceSchema>;
