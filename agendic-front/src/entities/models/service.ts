import { z } from 'zod';
import { SERVICE_CATEGORIES, slugSchema } from './business';

/**
 * All the public view of a Servicio knows about an Empleado: the email is only for the Dueño. `slug` is the Enlace de
 * reserva of the Usuario behind the Empleado, the last tramo of the Empleado elegido's (ADR 0026); null until they pick it.
 */
export const serviceEmployeeSchema = z.object({
    id: z.number(),
    name: z.string(),
    imageUrl: z.string().nullable(),
    slug: z.string().nullable(),
});
export type ServiceEmployee = z.infer<typeof serviceEmployeeSchema>;

/**
 * An active Servicio as GET /branches/:id/services returns it. `depositPercent` is the Seña; null means the Servicio
 * asks for none. `repeatEveryWeeks` and `repeatMaxBookings` are the Repetición (both null without one): with it, the
 * Cliente can Reservar a Serie.
 */
export const serviceSchema = z.object({
    id: z.number(),
    branchId: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    category: z.enum(SERVICE_CATEGORIES),
    durationMinutes: z.number(),
    price: z.number(),
    depositPercent: z.number().nullable(),
    repeatEveryWeeks: z.number().nullable(),
    repeatMaxBookings: z.number().nullable(),
    employees: z.array(serviceEmployeeSchema),
});
export type Service = z.infer<typeof serviceSchema>;

/** The Tiempo de preparación a Servicio may ask for, in minutes; 0 is none. */
export const PREP_MINUTES = [0, 5, 10, 15, 30, 60] as const;

/** A Cabina a Servicio admits, as the catalog lists it: only its name, which is all the panel shows of it (ADR 0030). */
export const serviceCabinSchema = z.object({ id: z.number(), name: z.string() });
export type ServiceCabin = z.infer<typeof serviceCabinSchema>;

/** An Empleado in charge of a Servicio in the panel's catalog, with the Availability they attend it with. */
export const catalogServiceEmployeeSchema = serviceEmployeeSchema.extend({ availabilityId: z.number() });
export type CatalogServiceEmployee = z.infer<typeof catalogServiceEmployeeSchema>;

/** The Repetición: a Serie repeats every this many weeks or more. */
export const REPEAT_EVERY_WEEKS_MIN = 1;

/** The Repetición: how many Turnos a Serie may have at most, from 2 to 10. */
export const REPEAT_MAX_BOOKINGS = { min: 2, max: 10 } as const;

/**
 * A Servicio as the panel's catalog and POST /branches/:id/services return it. `hidden` is the Servicio oculto,
 * `prepMinutes` the Tiempo de preparación, `dailyLimit` the Límite diario (null: no limit), `slotInterval` the
 * Intervalo (null: the duration) and `minimumNoticeMinutes` the Anticipación mínima (0: none). `repeatEveryWeeks` and
 * `repeatMaxBookings` are the Repetición: both set or both null (no Repetición). `cabins` are the active
 * Cabinas it admits, by name; empty when it uses none, and always empty in a Servicio personal.
 */
export const catalogServiceSchema = serviceSchema.extend({
    slug: z.string(),
    requiresApproval: z.boolean(),
    hidden: z.boolean(),
    prepMinutes: z.number(),
    dailyLimit: z.number().nullable(),
    slotInterval: z.number().nullable(),
    minimumNoticeMinutes: z.number(),
    employees: z.array(catalogServiceEmployeeSchema),
    cabins: z.array(serviceCabinSchema),
});
export type CatalogService = z.infer<typeof catalogServiceSchema>;

/**
 * One Negocio of GET /employees/me/services: where the Usuario is an active Empleado, with their role and their own
 * Empleado there, and its Sucursales (by tramo, even without Servicios) with the Servicios the Usuario may see.
 */
export const serviceCatalogGroupSchema = z.object({
    business: z.object({ id: z.number(), name: z.string(), slug: z.string(), logoUrl: z.string().nullable() }),
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

/**
 * A Servicio personal (ADR 0021): of a Usuario, attended with one of their Availability, without Sucursal or
 * Empleados. As GET and POST /users/me/services and the public GET /u/:userSlug return it. It has no `cabins`: the public
 * view never carries them and a Servicio personal uses none.
 */
export const personalServiceSchema = catalogServiceSchema
    .omit({ branchId: true, employees: true, cabins: true })
    .extend({ availabilityId: z.number() });
export type PersonalService = z.infer<typeof personalServiceSchema>;

/** What POST /users/me/services expects: the body of a Servicio del Negocio without Sucursal or Empleados, with its Availability. */
export const createPersonalServiceSchema = createServiceSchema
    .omit({ branchId: true, employeeIds: true })
    .extend({ availabilityId: z.number().int().positive() });
export type CreatePersonalService = z.infer<typeof createPersonalServiceSchema>;

/** Where a Servicio sits in the panel's catalog: its Negocio (with the Usuario's role there) and its Sucursal. */
export interface ServiceInCatalog {
    group: ServiceCatalogGroup;
    branch: ServiceCatalogGroup['branches'][number];
    service: CatalogService;
}

/** A Servicio of the Usuario: one of the catalog, with its Negocio and Sucursal, or one of their Servicios personales. */
export type MyService = ServiceInCatalog | { group: null; branch: null; service: PersonalService };

/**
 * What PATCH /services/:id accepts, plus the Servicio that goes in the path. Every field is optional: only the ones
 * sent change, on a Servicio del Negocio or a personal one. `depositPercent: null` drops the Seña, `dailyLimit: null` the Límite diario and `slotInterval: null`
 * the Intervalo. The Repetición goes with both `repeatEveryWeeks` and `repeatMaxBookings`, or both `null` to drop it.
 * `cabinIds` replaces the whole set of Cabinas the Servicio admits; `[]` leaves it with none.
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
    prepMinutes: z
        .number()
        .refine((m) => (PREP_MINUTES as readonly number[]).includes(m))
        .optional(),
    dailyLimit: z.number().int().min(1).nullable().optional(),
    slotInterval: z.number().int().min(1).nullable().optional(),
    minimumNoticeMinutes: z.number().int().min(0).optional(),
    repeatEveryWeeks: z.number().int().min(REPEAT_EVERY_WEEKS_MIN).nullable().optional(),
    repeatMaxBookings: z.number().int().min(REPEAT_MAX_BOOKINGS.min).max(REPEAT_MAX_BOOKINGS.max).nullable().optional(),
    /** Only a Servicio personal: one of the Usuario's own Availability. */
    availabilityId: z.number().int().positive().optional(),
    cabinIds: z.array(z.number().int().positive()).optional(),
});
export type UpdateService = z.infer<typeof updateServiceSchema>;

/** What DELETE /services/:id answers: how many future Turnos of the Servicio got cancelled by the baja. */
export const retiredServiceSchema = z.object({ cancelledBookings: z.number().int().min(0) });
export type RetiredService = z.infer<typeof retiredServiceSchema>;

/** An Empleado and the Servicio they start or stop offering: the path of POST and DELETE /services/:id/employees. */
export const serviceEmployeeRefSchema = z.object({
    serviceId: z.number().int().positive(),
    employeeId: z.number().int().positive(),
});
export type ServiceEmployeeRef = z.infer<typeof serviceEmployeeRefSchema>;

/** What DELETE /services/:id/employees/:employeeId answers: how many future Turnos of that Empleado got cancelled. */
export const removedEmployeeSchema = z.object({ cancelledBookings: z.number().int().min(0) });
export type RemovedEmployee = z.infer<typeof removedEmployeeSchema>;

/** The Availability an Empleado attends a Servicio with: the path and body of PATCH /services/:id/employees/:employeeId. */
export const serviceEmployeeAvailabilitySchema = serviceEmployeeRefSchema.extend({
    availabilityId: z.number().int().positive(),
});
/** An Empleado, the Servicio they attend and the Availability they switch to. */
export type ServiceEmployeeAvailability = z.infer<typeof serviceEmployeeAvailabilitySchema>;
