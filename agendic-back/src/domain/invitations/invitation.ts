/** Invitación pendiente de un Negocio a un email para que sea Empleado (ADR 0019). */
export interface Invitation {
  id: number;
  businessId: number;
  /** Always lowercase. */
  email: string;
  expiresAt: Date;
}

/** Días que una Invitación sigue pendiente. */
export const INVITATION_TTL_DAYS = 7;
