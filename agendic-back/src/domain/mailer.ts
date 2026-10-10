export const MAILER = Symbol('Mailer');

export interface Mailer {
  /** Sends an email with a Código de verificación to Reservar. */
  sendVerificationCode(email: string, code: string): Promise<void>;
  /** Confirmación de reserva: the Turno was created, with its Enlace del Turno (ADR 0022). */
  sendBookingConfirmation(email: string, link: string): Promise<void>;
  /** Aviso de cambio del Turno: the Turno was cancelled, by whoever did it or by a baja, with its Enlace del Turno. */
  sendBookingCancellation(email: string, link: string): Promise<void>;
  /** Aviso de cambio del Turno: the Turno moved to another horario, with its Enlace del Turno. */
  sendBookingReschedule(email: string, link: string): Promise<void>;
  /** Aviso de cambio del Turno: the Negocio rejected the pending Turno, with its Enlace del Turno. */
  sendBookingRejection(email: string, link: string): Promise<void>;
}
