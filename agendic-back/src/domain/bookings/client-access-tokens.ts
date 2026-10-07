export const CLIENT_ACCESS_TOKENS = Symbol('ClientAccessTokens');

/** Un acceso firmado de 15 minutos a Mis turnos, atado a un email (ADR 0022). */
export interface ClientAccess {
  access: string;
  expiresAt: Date;
}

export interface ClientAccessTokens {
  /** Firma un acceso de 15 minutos para email. */
  sign(email: string): ClientAccess;
  /** El email al que pertenece `access`, o null si es inválido o ya venció. */
  verify(access: string): string | null;
}
