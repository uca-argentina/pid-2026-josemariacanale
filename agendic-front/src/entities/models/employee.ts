import { z } from 'zod';

// The Dueño's view of an Empleado, as GET /businesses/:id/employees returns it.
export const employeeSchema = z.object({
    id: z.number(),
    userId: z.union([z.number(), z.string()]),
    name: z.string(),
    email: z.string(),
    imageUrl: z.string().nullable(),
});
export type Employee = z.infer<typeof employeeSchema>;

/** La Invitación que crea POST /businesses/:id/employees y lista GET /businesses/:id/invitations. */
export const invitationSchema = z.object({
    id: z.number(),
    email: z.string(),
    expiresAt: z.string(),
});
export type Invitation = z.infer<typeof invitationSchema>;

// The exact shape POST /businesses/:id/employees expects, plus the businessId that goes in the path.
export const createEmployeeSchema = z.object({
    businessId: z.number(),
    email: z.string(),
});
export type CreateEmployee = z.infer<typeof createEmployeeSchema>;

/** La Invitación pendiente del Usuario, como la lista GET /invitations/me. */
export const myInvitationSchema = z.object({
    id: z.number(),
    business: z.object({ name: z.string(), slug: z.string() }),
});
export type MyInvitation = z.infer<typeof myInvitationSchema>;
