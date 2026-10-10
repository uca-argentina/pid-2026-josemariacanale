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

  async sendBookingConfirmation(email: string, link: string) {
    await this.sendBookingMail(
      email,
      link,
      'Your booking is confirmed',
      'Your Turno is confirmed. Manage it here',
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
