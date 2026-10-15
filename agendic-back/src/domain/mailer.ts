export const MAILER = Symbol('Mailer');

export interface Mailer {
  /** Sends an email with a Código de verificación to Reservar. */
  sendVerificationCode(email: string, code: string): Promise<void>;
  /** Confirmación de reserva: the Turno was created, with its Enlace del Turno (ADR 0022) and, if it has one, the Seña to pay from there. */
  sendBookingConfirmation(
    email: string,
    link: string,
    depositAmount: number | null,
  ): Promise<void>;
  /** Aviso de cambio del Turno: the Turno was cancelled, by whoever did it or by a baja, with its Enlace del Turno. */
  sendBookingCancellation(email: string, link: string): Promise<void>;
  /** Aviso de cambio del Turno: the Turno moved to another horario, with its Enlace del Turno. */
  sendBookingReschedule(email: string, link: string): Promise<void>;
  /** Aviso de cambio del Turno: the Negocio rejected the pending Turno, with its Enlace del Turno. */
  sendBookingRejection(email: string, link: string): Promise<void>;
  /** Invitación a Calificar: asks the Cliente to rate the Turno of `serviceName` that started at `startsAt`, shown in `timeZone`, with its Enlace del Turno. */
  sendRatingRequest(
    email: string,
    link: string,
    serviceName: string,
    startsAt: Date,
    timeZone: string,
  ): Promise<void>;
  /** Confirmación de anotación: the Cliente joined the Lista de espera of `serviceName` for `date` (`YYYY-MM-DD`), with the link to Salir. */
  sendWaitlistConfirmation(
    email: string,
    clientName: string,
    serviceName: string,
    date: string,
    link: string,
  ): Promise<void>;
  /**
   * Aviso de horario libre: a Horario reservable appeared in `serviceName` on `date` (`YYYY-MM-DD`), without saying which.
   * `bookingPath` is the path and query of the page to Reservar, and `link` the secret to Salir de la Lista de espera.
   */
  sendFreeSlotNotice(
    email: string,
    clientName: string,
    serviceName: string,
    date: string,
    bookingPath: string,
    link: string,
  ): Promise<void>;
}
