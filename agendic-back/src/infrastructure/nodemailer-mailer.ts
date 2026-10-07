import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { Mailer } from '../domain/mailer';

@Injectable()
export class NodemailerMailer implements Mailer {
  private readonly transporter: Transporter;

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
    const url = `${process.env.FRONT_URL}/turnos/${link}`;
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Your booking is confirmed',
      html: `<p>Your Turno is confirmed. Manage it here: <a href="${url}">${url}</a></p>`,
    });
  }
}
