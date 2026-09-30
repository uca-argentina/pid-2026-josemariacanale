import { z } from 'zod';

// The Dueño's view of an Empleado, as GET /businesses/:id/employees returns it.
export const employeeSchema = z.object({
    id: z.number(),
    userId: z.union([z.number(), z.string()]),
    name: z.string(),
    email: z.string(),
});
export type Employee = z.infer<typeof employeeSchema>;

// The exact shape POST /businesses/:id/employees expects, plus the businessId that goes in the path.
export const createEmployeeSchema = z.object({
    businessId: z.number(),
    name: z.string(),
    email: z.string(),
});
export type CreateEmployee = z.infer<typeof createEmployeeSchema>;
