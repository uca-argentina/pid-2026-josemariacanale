import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { Mailer, SeriesConfirmation } from '../domain/mailer';

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

  /**
   * Avisa que el Turno quedó creado; con Seña, suma el monto y dice que se paga desde el Enlace del Turno. De una Serie
   * lista cada fecha, en la zona del Turno, con su Enlace.
   */
  async sendBookingConfirmation(
    email: string,
    link: string,
    depositAmount: number | null,
    series?: SeriesConfirmation,
  ) {
    const deposit =
      depositAmount === null
        ? ''
        : ` Seña: ${depositAmount.toFixed(2)}. You can pay it from the same link.`;
    if (series) {
      const seriesDeposit =
        depositAmount === null
          ? ''
          : ` Seña per Turno: ${depositAmount.toFixed(2)}. You can pay each from its own link.`;
      const when = new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'full',
        timeStyle: 'short',
        hourCycle: 'h23',
        timeZone: series.timeZone,
      });
      const items = series.bookings
        .map(({ startsAt, link: bookingLink }) => {
          const url = `${this.frontendUrl}/turnos/${bookingLink}`;
          return `<li>${when.format(startsAt)}: <a href="${url}">${url}</a></li>`;
        })
        .join('');
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Your bookings are confirmed',
        html: `<p>Your Turnos are confirmed.${seriesDeposit} Manage each one from its link:</p><ul>${items}</ul>`,
      });
      return;
    }
    await this.sendBookingMail(
      email,
      link,
      'Your booking is confirmed',
      `Your Turno is confirmed.${deposit} Manage it here`,
    );
  }

  /** Avisa que el Turno quedó cancelado. */
  async sendBookingCancellation(email: string, link: string, reason?: string | null) {
    await this.sendBookingMail(
      email,
      link,
      'Your booking was cancelled',
      withReason('Your Turno was cancelled', reason) + '. See it here',
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
  async sendBookingRejection(email: string, link: string, reason?: string | null) {
    await this.sendBookingMail(
      email,
      link,
      'Your booking was rejected',
      withReason('Your Turno was rejected', reason) + '. See it here',
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

/** Appends the Motivo de cancelación, if any, to a mail text; it is typed by a person, so it goes escaped into the HTML. */
const withReason = (text: string, reason?: string | null) =>
  reason ? `${text}. Reason: ${escapeHtml(reason)}` : text;
