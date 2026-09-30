import { z } from 'zod';
import { SERVICE_CATEGORIES } from './business';

// All the public view of a Servicio knows about an Empleado: the email is only for the Dueño.
export const serviceEmployeeSchema = z.object({
    id: z.number(),
    name: z.string(),
});
export type ServiceEmployee = z.infer<typeof serviceEmployeeSchema>;

// An active Servicio as GET /branches/:id/services returns it. `depositPercent` is the Seña;
// null means the Servicio asks for none.
export const serviceSchema = z.object({
    id: z.number(),
    branchId: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    category: z.enum(SERVICE_CATEGORIES),
    durationMinutes: z.number(),
    price: z.number(),
    depositPercent: z.number().nullable(),
    employees: z.array(serviceEmployeeSchema),
});
export type Service = z.infer<typeof serviceSchema>;
