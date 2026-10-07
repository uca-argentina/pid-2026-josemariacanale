export const MAILER = Symbol('Mailer');

export interface Mailer {
  /** Sends an email with a Código de verificación to Reservar or to enter Mis turnos. */
  sendVerificationCode(email: string, code: string): Promise<void>;
}
