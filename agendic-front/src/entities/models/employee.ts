import { z } from 'zod';
import { badgeLevelSchema } from './badge';

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

/** La Invitación pendiente del Usuario, como la lista GET /invitations/me; `branches` son donde va a trabajar. */
export const myInvitationSchema = z.object({
    id: z.number(),
    business: z.object({ name: z.string(), slug: z.string() }),
    branches: z.array(z.object({ id: z.number(), name: z.string() })),
});
export type MyInvitation = z.infer<typeof myInvitationSchema>;
