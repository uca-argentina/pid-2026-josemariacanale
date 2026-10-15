import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { Mailer } from '../domain/mailer';

/**
 * Reads the front's base URL, where the Enlace del Turno of the Confirmación de reserva points. Throws when it is
 * missing, so a misconfigured back fails at startup instead of mailing `undefined/turnos/…` after creating the Turno.
 */
export function readFrontendUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  if (!env.FRONTEND_URL)
    throw new Error('Mailer is not configured: missing FRONTEND_URL');
  return env.FRONTEND_URL.replace(/\/+$/, '');
}

/** The Servicio name is typed by the Dueño; it goes into HTML. */
const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

@Injectable()
export class NodemailerMailer implements Mailer {
  private readonly transporter: Transporter;
  private readonly frontendUrl = readFrontendUrl();

  constructor() {
    this.transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }

  async sendVerificationCode(email: string, code: string) {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Your verification code',
      html: `<p>Your verification code is <strong>${code}</strong>. It expires in 15 minutes.</p>`,
    });
  }

  /** Avisa que el Turno quedó creado; con Seña, suma el monto y dice que se paga desde el Enlace del Turno. */
  async sendBookingConfirmation(
    email: string,
    link: string,
    depositAmount: number | null,
  ) {
    const deposit =
      depositAmount === null
        ? ''
        : ` Seña: ${depositAmount.toFixed(2)}. You can pay it from the same link.`;
    await this.sendBookingMail(
      email,
      link,
      'Your booking is confirmed',
      `Your Turno is confirmed.${deposit} Manage it here`,
    );
  }

  /** Avisa que el Turno quedó cancelado. */
  async sendBookingCancellation(email: string, link: string) {
    await this.sendBookingMail(
      email,
      link,
      'Your booking was cancelled',
      'Your Turno was cancelled. See it here',
    );
  }

  /** Avisa que el Turno pasó a otro horario. */
  async sendBookingReschedule(email: string, link: string) {
    await this.sendBookingMail(
      email,
      link,
      'Your booking was rescheduled',
      'Your Turno was moved to another time. See the new time here',
    );
  }

  /** Avisa que el Negocio rechazó el Turno pendiente. */
  async sendBookingRejection(email: string, link: string) {
    await this.sendBookingMail(
      email,
      link,
      'Your booking was rejected',
      'Your Turno was rejected. See it here',
    );
  }

  /** Invita al Cliente a Calificar el Turno, con el Servicio y el día y la hora en la zona del Turno.
   *
   * @throws el transporte SMTP rechazó el mail
   */
  async sendRatingRequest(
    email: string,
    link: string,
    serviceName: string,
    startsAt: Date,
    timeZone: string,
  ) {
    const when = new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'full',
      timeStyle: 'short',
      hourCycle: 'h23',
      timeZone,
    }).format(startsAt);
    const url = `${this.frontendUrl}/turnos/${link}`;
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: '¿Cómo te fue en tu turno?',
      html: `<p>Tu turno de ${escapeHtml(serviceName)} del ${when} ya terminó. Contanos cómo te fue: <a href="${url}">${url}</a></p>`,
    });
  }

  /**
   * Confirmación de anotación.
   *
   * @throws {Error} el transporte SMTP rechazó el mail
   */
  async sendWaitlistConfirmation(
    email: string,
    clientName: string,
    serviceName: string,
    date: string,
    link: string,
  ) {
    const day = new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'full',
      timeZone: 'UTC', // `date` is a calendar day, not an instant
    }).format(new Date(`${date}T00:00:00.000Z`));
    const url = `${this.frontendUrl}/lista-de-espera/${link}`;
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Te anotaste en la lista de espera',
      html: `<p>Hola ${escapeHtml(clientName)}, te anotaste en la lista de espera de ${escapeHtml(serviceName)} para el ${day}. Si se libera un horario, te avisamos por mail. Si ya no lo necesitás, podés salir de la lista: <a href="${url}">${url}</a></p>`,
    });
  }

  /**
   * Aviso de horario libre.
   *
   * @throws {Error} el transporte SMTP rechazó el mail
   */
  async sendFreeSlotNotice(
    email: string,
    clientName: string,
    serviceName: string,
    date: string,
    bookingPath: string,
    link: string,
  ) {
    const day = new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'full',
      timeZone: 'UTC', // `date` is a calendar day, not an instant
    }).format(new Date(`${date}T00:00:00.000Z`));
    const bookingUrl = `${this.frontendUrl}${bookingPath}`;
    const leaveUrl = `${this.frontendUrl}/lista-de-espera/${link}`;
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Se liberó un horario',
      html: `<p>Hola ${escapeHtml(clientName)}, se liberó un horario de ${escapeHtml(serviceName)} para el ${day}. Se lo lleva quien reserve primero: <a href="${escapeHtml(bookingUrl)}">${escapeHtml(bookingUrl)}</a></p><p>Si ya no lo necesitás, podés salir de la lista de espera: <a href="${leaveUrl}">${leaveUrl}</a></p>`,
    });
  }

  private async sendBookingMail(
    email: string,
    link: string,
    subject: string,
    text: string,
  ) {
    const url = `${this.frontendUrl}/turnos/${link}`;
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject,
      html: `<p>${text}: <a href="${url}">${url}</a></p>`,
    });
  }
}
