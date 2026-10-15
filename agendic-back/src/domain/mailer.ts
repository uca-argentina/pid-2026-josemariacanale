export const MAILER = Symbol('Mailer');

/** A Turno cancelled with a Causa de cancelación, as the mail lists it. */
export interface CausedCancellation {
  /** Enlace del Turno. */
  link: string;
  serviceName: string;
  startsAt: Date;
  /** The zone `startsAt` is shown in. */
  timeZone: string;
  /** Motivo de cancelación Agendic wrote. */
  reason: string;
}

export interface Mailer {
  /** Sends an email with a Código de verificación to Reservar. */
  sendVerificationCode(email: string, code: string): Promise<void>;
  /** Confirmación de reserva: the Turno was created, with its Enlace del Turno (ADR 0022) and, if it has one, the Seña to pay from there. */
  sendBookingConfirmation(
    email: string,
    link: string,
    depositAmount: number | null,
  ): Promise<void>;
  /** Aviso de cambio del Turno: the Turno was cancelled, by whoever did it or by a baja, with its Enlace del Turno and the Motivo de cancelación if it has one. */
  sendBookingCancellation(email: string, link: string, reason?: string | null): Promise<void>;
  /** Aviso de cambio del Turno: the Turno moved to another horario, with its Enlace del Turno. */
  sendBookingReschedule(email: string, link: string): Promise<void>;
  /** Aviso de cambio del Turno: the Negocio rejected the pending Turno, with its Enlace del Turno and the Motivo de cancelación if it has one. */
  sendBookingRejection(email: string, link: string, reason?: string | null): Promise<void>;
  /** Invitación a Calificar: asks the Cliente to rate the Turno of `serviceName` that started at `startsAt`, shown in `timeZone`, with its Enlace del Turno. */
  sendRatingRequest(
    email: string,
    link: string,
    serviceName: string,
    startsAt: Date,
    timeZone: string,
  ): Promise<void>;
  /**
   * Aviso de cambio del Turno con Causa: one mail for all the Turnos of one Cliente that a change in the horario of
   * whoever attends them cancelled, each with its Enlace del Turno. Only these cancellations use it.
   */
  sendBookingCancellationWithCause(
    email: string,
    bookings: CausedCancellation[],
  ): Promise<void>;
}
