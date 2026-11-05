import { ClientInvite } from './calendar/client-invite';
import { PromisedPrize, StreakProgress } from './streaks/streak-prize';

export const MAILER = Symbol('Mailer');

/** The Turnos of a Serie to list in its Confirmación de reserva, with the zone their dates are shown in. */
export type SeriesConfirmation = {
  bookings: { startsAt: Date; link: string }[];
  timeZone: string;
};

/** The Turnos of a Serie an Aviso de cambio del Turno covers (#305): the same shape as its Confirmación de reserva. */
export type SeriesNotice = SeriesConfirmation;
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
  /**
   * Every mail that tells about a Turno takes an optional `invite` (#404): the archivo de calendario to attach (`REQUEST` in the Confirmación de reserva, when Reagendar and when Aceptar turno, `CANCEL` when cancelled or rejected). Without it the mail goes out as usual.
   *
   * Confirmación de reserva: the Turno was created, with its Enlace del Turno (ADR 0022) and, if it has one, the Seña to pay from there.
   * For a Serie (#304), `series` lists every Turno with its own Enlace, the dates shown in `timeZone`, in this one mail.
   * With `streak`, the Cliente's Racha and what is left to the next Recompensa go in a line; without it the mail is the same as ever.
   */
  sendBookingConfirmation(
    email: string,
    link: string,
    depositAmount: number | null,
    series?: SeriesConfirmation,
    streak?: StreakProgress,
    invite?: ClientInvite,
  ): Promise<void>;
  /**
   * Aviso de cambio del Turno: the Turno was cancelled, by whoever did it or by a baja, with its Enlace del Turno and the Motivo de cancelación if it has one.
   * Cancelling several Turnos of a Serie at once (#305), `series` lists them all, with their dates, in this one mail.
   */
  sendBookingCancellation(
    email: string,
    link: string,
    reason?: string | null,
    series?: SeriesNotice,
    invite?: ClientInvite,
  ): Promise<void>;
  /** Aviso de cambio del Turno: the Turno moved to another horario, with its Enlace del Turno. */
  sendBookingReschedule(
    email: string,
    link: string,
    invite?: ClientInvite,
  ): Promise<void>;
  /**
   * Aviso de cambio del Turno: the Negocio rejected the pending Turno, with its Enlace del Turno and the Motivo de cancelación if it has one.
   * Rejecting a Serie (#305), `series` lists every Turno rejected, with their dates, in this one mail.
   */
  sendBookingRejection(
    email: string,
    link: string,
    reason?: string | null,
    series?: SeriesNotice,
    invite?: ClientInvite,
  ): Promise<void>;
  /**
   * Aviso de cambio del Turno: the Negocio accepted the pending Turno, with its Enlace del Turno.
   * Accepting a Serie (#305), `series` lists every Turno accepted, with their dates, in this one mail.
   */
  sendBookingAcceptance(
    email: string,
    link: string,
    series?: SeriesNotice,
    invite?: ClientInvite,
  ): Promise<void>;
  /** Invitación a Calificar: asks the Cliente to rate the Turno of `serviceName` that started at `startsAt`, shown in `timeZone`, with its Enlace del Turno. */
  sendRatingRequest(
    email: string,
    link: string,
    serviceName: string,
    startsAt: Date,
    timeZone: string,
  ): Promise<void>;
  /**
   * Aviso de Premio: tells the Cliente what their Racha earned and until when it lasts (`expiresAt` shown in `timeZone`,
   * null when it does not expire), with the Enlace del Turno of the Turno that gave it.
   *
   * @throws {Error} the SMTP transport rejected the mail
   */
  sendStreakPrizeNotice(
    email: string,
    clientName: string,
    promised: PromisedPrize,
    expiresAt: Date | null,
    timeZone: string,
    link: string,
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
   * Aviso de horario libre: apareció un Horario reservable de `serviceName` el `date` (`YYYY-MM-DD`), sin decir cuál.
   * `bookingPath` es el path con query de la página de reserva, y `link` el secreto para Salir de la Lista de espera.
   */
  sendFreeSlotNotice(
    email: string,
    clientName: string,
    serviceName: string,
    date: string,
    bookingPath: string,
    link: string,
  ): Promise<void>;
  /**
   * Aviso de cambio del Turno con Causa: one mail for all the Turnos of one Cliente that a change in the horario of
   * whoever attends them cancelled, each with its Enlace del Turno. Only these cancellations use it.
   */
  sendBookingCancellationWithCause(
    email: string,
    bookings: CausedCancellation[],
    invite?: ClientInvite,
  ): Promise<void>;
}
