import { z } from 'zod';
import { SERVICE_CATEGORIES, slugSchema } from './business';

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

/** An Empleado in charge of a Servicio in the panel's catalog, with the Availability they attend it with. */
export const catalogServiceEmployeeSchema = serviceEmployeeSchema.extend({ availabilityId: z.number() });
export type CatalogServiceEmployee = z.infer<typeof catalogServiceEmployeeSchema>;

/** A Servicio as the panel's catalog and POST /branches/:id/services return it. `hidden` is the Servicio oculto. */
export const catalogServiceSchema = serviceSchema.extend({
    slug: z.string(),
    requiresApproval: z.boolean(),
    hidden: z.boolean(),
    employees: z.array(catalogServiceEmployeeSchema),
});
export type CatalogService = z.infer<typeof catalogServiceSchema>;

/**
 * One Negocio of GET /employees/me/services: where the Usuario is an active Empleado, with their role and their own
 * Empleado there, and its Sucursales (by tramo, even without Servicios) with the Servicios the Usuario may see.
 */
export const serviceCatalogGroupSchema = z.object({
    business: z.object({ id: z.number(), name: z.string(), slug: z.string() }),
    role: z.enum(['owner', 'employee']),
    employeeId: z.number(),
    branches: z.array(
        z.object({ id: z.number(), name: z.string(), slug: z.string(), services: z.array(catalogServiceSchema) }),
    ),
});
export type ServiceCatalogGroup = z.infer<typeof serviceCatalogGroupSchema>;

/** What POST /branches/:id/services expects, plus the Sucursal that goes in the path. */
export const createServiceSchema = z.object({
    branchId: z.number().int(),
    name: z.string().trim().min(1),
    slug: slugSchema,
    description: z.string().trim().optional(),
    category: z.enum(SERVICE_CATEGORIES),
    durationMinutes: z.number().int().min(1),
    price: z.number().min(0),
    employeeIds: z.array(z.number().int()).min(1),
});
export type CreateService = z.infer<typeof createServiceSchema>;

/** Where a Servicio sits in the panel's catalog: its Negocio (with the Usuario's role there) and its Sucursal. */
export interface ServiceInCatalog {
    group: ServiceCatalogGroup;
    branch: ServiceCatalogGroup['branches'][number];
    service: CatalogService;
}

/**
 * What PATCH /services/:id accepts, plus the Servicio that goes in the path. Every field is optional: only the ones
 * sent change. `depositPercent: null` drops the Seña.
 */
export const updateServiceSchema = z.object({
    id: z.number().int(),
    name: z.string().trim().min(1).optional(),
    slug: slugSchema.optional(),
    description: z.string().trim().min(1).optional(),
    category: z.enum(SERVICE_CATEGORIES).optional(),
    durationMinutes: z.number().int().min(1).optional(),
    price: z.number().min(0).optional(),
    depositPercent: z.number().int().min(0).max(100).nullable().optional(),
    requiresApproval: z.boolean().optional(),
    hidden: z.boolean().optional(),
});
export type UpdateService = z.infer<typeof updateServiceSchema>;

/** What DELETE /services/:id answers: how many future Turnos of the Servicio got cancelled by the baja. */
export const retiredServiceSchema = z.object({ cancelledBookings: z.number().int().min(0) });
export type RetiredService = z.infer<typeof retiredServiceSchema>;
