import { z } from 'zod';
import { badgeLevelSchema } from './badge';
import { cancelBookingIdsSchema, leftOutsideBookingSchema } from './left-outside-booking';

/**
 * Una Insignia ganada por un Empleado, como la trae el Staff: su Nivel más alto, sin progreso (ADR 0007).
 * `badge` sigue siendo un string libre para que una Insignia nueva del back no rompa la tabla.
 */
export const employeeBadgeSchema = z.object({
    badge: z.string(),
    name: z.string(),
    level: badgeLevelSchema,
});
export type EmployeeBadge = z.infer<typeof employeeBadgeSchema>;

/**
 * El Empleado de un Negocio, como lo devuelve GET /businesses/:id/employees; `branchIds` son las Sucursales donde
 * trabaja y `badges` viene de mayor a menor Nivel, `[]` si no ganó ninguna.
 */
export const employeeSchema = z.object({
    id: z.number(),
    userId: z.union([z.number(), z.string()]),
    name: z.string(),
    email: z.string(),
    imageUrl: z.string().nullable(),
    branchIds: z.array(z.number()),
    badges: z.array(employeeBadgeSchema),
});
export type Employee = z.infer<typeof employeeSchema>;

/**
 * La Invitación que crea POST /businesses/:id/employees y lista GET /businesses/:id/invitations; `branchIds` son las
 * Sucursales donde va a trabajar la persona invitada.
 */
export const invitationSchema = z.object({
    id: z.number(),
    email: z.string(),
    expiresAt: z.string(),
    branchIds: z.array(z.number()),
});
export type Invitation = z.infer<typeof invitationSchema>;

/**
 * Lo que POST /businesses/:id/employees espera, más el businessId del path. Sin `branchIds` el back usa la única
 * Sucursal del Negocio; con más de una son obligatorias.
 */
export const createEmployeeSchema = z.object({
    businessId: z.number(),
    email: z.string(),
    branchIds: z.array(z.number()).optional(),
});
export type CreateEmployee = z.infer<typeof createEmployeeSchema>;

/** Las Sucursales nuevas de un Empleado: el `employeeId` va en la ruta y `branchIds` en el cuerpo. */
export const employeeBranchesSchema = z.object({
    employeeId: z.number().int().positive(),
    branchIds: z.array(z.number().int().positive()),
});
export type EmployeeBranches = z.infer<typeof employeeBranchesSchema>;

/** Cambiar las Sucursales con los Turnos que el Dueño confirmó cancelar: el cuerpo de `PUT /employees/:id/branches`. */
export const confirmedEmployeeBranchesSchema = employeeBranchesSchema.extend({ cancelBookingIds: cancelBookingIdsSchema.optional() });
export type ConfirmedEmployeeBranches = z.infer<typeof confirmedEmployeeBranchesSchema>;

/**
 * Un Turno pendiente o aceptado que cambiar las Sucursales del Empleado cancelaría, como lo devuelve
 * `POST /employees/:id/branches/preview`; `timeZone` es la de la Sucursal.
 */
export const branchCancelledBookingSchema = leftOutsideBookingSchema
    .pick({ id: true, startsAt: true, endsAt: true, timeZone: true, serviceName: true, clientName: true })
    .extend({ branch: z.object({ id: z.number(), name: z.string() }) });
export type BranchCancelledBooking = z.infer<typeof branchCancelledBookingSchema>;

/** La Invitación pendiente del Usuario, como la lista GET /invitations/me; `branches` son donde va a trabajar. */
export const myInvitationSchema = z.object({
    id: z.number(),
    business: z.object({ name: z.string(), slug: z.string() }),
    branches: z.array(z.object({ id: z.number(), name: z.string() })),
});
export type MyInvitation = z.infer<typeof myInvitationSchema>;
