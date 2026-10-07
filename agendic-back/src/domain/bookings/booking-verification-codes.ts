export const BOOKING_VERIFICATION_CODES = Symbol('BookingVerificationCodes');

/** El Código de verificación que el Cliente pide antes de Reservar (ADR 0022). */
export interface BookingVerificationCodes {
  /**
   * Genera un código para el email, válido unos 15 minutos.
   *
   * @throws {TooManyRequestsError} ya se pidieron 5 códigos para ese email en los últimos 15 minutos
   */
  request(email: string): string;
  /** True si el código es válido para ese email en la ventana vigente. */
  verify(email: string, code: string): boolean;
}
