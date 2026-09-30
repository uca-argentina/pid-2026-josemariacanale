import { z } from 'zod';

/** La vista del Dueño de un Empleado, como la devuelve GET /businesses/:id/employees. */
export const employeeSchema = z.object({
    id: z.number(),
    userId: z.union([z.number(), z.string()]),
    name: z.string(),
    email: z.string(),
});
export type Employee = z.infer<typeof employeeSchema>;

/** La forma exacta que espera POST /businesses/:id/employees, más el businessId del path. */
export const createEmployeeSchema = z.object({
    businessId: z.number(),
    email: z.string(),
});
export type CreateEmployee = z.infer<typeof createEmployeeSchema>;
