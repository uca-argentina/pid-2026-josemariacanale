import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { ClientInvite } from '../domain/calendar/client-invite';
import {
  CausedCancellation,
  ConfirmationBranch,
  Mailer,
  SeriesConfirmation,
  SeriesNotice,
} from '../domain/mailer';
import { PromisedPrize, StreakProgress } from '../domain/streaks/streak-prize';
import { StreakRewardType } from '../domain/streaks/streak-program';

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

/** The archivo de calendario as nodemailer attaches it: a `text/calendar` alternative with its `METHOD`, which is what Gmail and Outlook read as an invitation. */
const calendarOf = (invite?: ClientInvite) =>
  invite ? { icalEvent: { method: invite.method, content: invite.ics } } : {};

/** "Agregar a Google Calendar" and "Agregar a Outlook" of a Turno. */
const addLinks = (invite: ClientInvite | undefined, link: string) => {
  const urls = invite?.events.find((event) => event.link === link);
  return urls
    ? ` <a href="${escapeHtml(urls.googleUrl)}">Agregar a Google Calendar</a> · <a href="${escapeHtml(urls.outlookUrl)}">Agregar a Outlook</a>`
    : '';
};

/** Day and hour of a Turno in the zone it is shown in; the same in the Invitación a calificar and the Aviso con Causa. */
const formatWhen = (startsAt: Date, timeZone: string) =>
  new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'full',
    timeStyle: 'short',
    hourCycle: 'h23',
    timeZone,
  }).format(startsAt);

// What the Dueño typed goes escaped.
const promisedText = ({ type, value, description, serviceName }: PromisedPrize) => {
  switch (type) {
    case StreakRewardType.PERCENT_DISCOUNT:
      return `${new Intl.NumberFormat('es-AR').format(value ?? 0)}% de descuento`;
    case StreakRewardType.AMOUNT_DISCOUNT:
      return `$${new Intl.NumberFormat('es-AR').format(value ?? 0)} de descuento`;
    case StreakRewardType.GIFT:
      return escapeHtml(description ?? '');
    case StreakRewardType.FREE_SERVICE:
      return `${escapeHtml(serviceName ?? 'Un Servicio')} gratis`;
  }
};

const turnos = (count: number) => (count === 1 ? '1 Turno' : `${count} Turnos`);

/** The line of the Confirmación de reserva about the Racha of the Cliente. */
const streakLine = ({ count, next }: StreakProgress) => {
  if (!next) return `Tu Racha: ${turnos(count)}.`;
  const reward = promisedText(next.reward);
  if (count === 0)
    return `Empezá tu Racha: con ${turnos(next.remaining)} ganás ${reward}.`;
  const missing = next.remaining === 1 ? 'Te falta 1' : `Te faltan ${next.remaining}`;
  return `Tu Racha: ${turnos(count)}. ${missing} para ${reward}.`;
};

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
   * lista cada fecha, en la zona del Turno, con su Enlace. Con `streak`, suma la línea de la Racha. Con Sucursal, cierra
   * con su dirección y Cómo llegar.
   */
  async sendBookingConfirmation(
    email: string,
    link: string,
    depositAmount: number | null,
    branch: ConfirmationBranch | null,
    series?: SeriesConfirmation,
    streak?: StreakProgress,
    invite?: ClientInvite,
  ) {
    const racha = streak ? ` ${streakLine(streak)}` : '';
    const deposit =
      depositAmount === null
        ? ''
        : ` Seña: ${depositAmount.toFixed(2)}. You can pay it from the same link.`;
    const place = branch ? addressAndDirectionsHtml(branch) : '';
    if (series) {
      const seriesDeposit =
        depositAmount === null
          ? ''
          : ` Seña per Turno: ${depositAmount.toFixed(2)}. You can pay each from its own link.`;
      const items = this.seriesItems(series, invite);
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Your bookings are confirmed',
        html: `<p>Your Turnos are confirmed.${seriesDeposit}${racha} Manage each one from its link:</p><ul>${items}</ul>${place}`,
        ...calendarOf(invite),
      });
      return;
    }
    await this.sendBookingMail(
      email,
      link,
      'Your booking is confirmed',
      `Your Turno is confirmed.${deposit}${racha} Manage it here`,
      invite,
      addLinks(invite, link),
      place,
    );
  }

  /** Avisa que el Turno quedó cancelado; de varios Turnos de una Serie, los lista en un solo mail. */
  async sendBookingCancellation(
    email: string,
    link: string,
    reason?: string | null,
    series?: SeriesNotice,
    invite?: ClientInvite,
  ) {
    if (series) {
      await this.sendSeriesMail(email, 'Your bookings were cancelled', 'Your Turnos were cancelled', reason, series, invite);
      return;
    }
    await this.sendBookingMail(
      email,
      link,
      'Your booking was cancelled',
      withReason('Your Turno was cancelled', reason) + '. See it here',
      invite,
    );
  }

  /** Avisa que el Turno pasó a otro horario. */
  async sendBookingReschedule(
    email: string,
    link: string,
    invite?: ClientInvite,
  ) {
    await this.sendBookingMail(
      email,
      link,
      'Your booking was rescheduled',
      'Your Turno was moved to another time. See the new time here',
      invite,
    );
  }

  /** Avisa que el Negocio rechazó el Turno pendiente; de varios Turnos de una Serie, los lista en un solo mail. */
  async sendBookingRejection(
    email: string,
    link: string,
    reason?: string | null,
    series?: SeriesNotice,
    invite?: ClientInvite,
  ) {
    if (series) {
      await this.sendSeriesMail(email, 'Your bookings were rejected', 'Your Turnos were rejected', reason, series, invite);
      return;
    }
    await this.sendBookingMail(
      email,
      link,
      'Your booking was rejected',
      withReason('Your Turno was rejected', reason) + '. See it here',
      invite,
    );
  }

  /** Avisa que el Negocio aceptó el Turno pendiente; de varios Turnos de una Serie, los lista en un solo mail. */
  async sendBookingAcceptance(
    email: string,
    link: string,
    series?: SeriesNotice,
    invite?: ClientInvite,
  ) {
    if (series) {
      await this.sendSeriesMail(email, 'Your bookings were accepted', 'Your Turnos were accepted', null, series, invite);
      return;
    }
    await this.sendBookingMail(
      email,
      link,
      'Your booking was accepted',
      'Your Turno was accepted. See it here',
      invite,
      addLinks(invite, link),
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
    const when = formatWhen(startsAt, timeZone);
    const url = `${this.frontendUrl}/turnos/${link}`;
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: '¿Cómo te fue en tu turno?',
      html: `<p>Tu turno de ${escapeHtml(serviceName)} del ${when} ya terminó. Contanos cómo te fue: <a href="${url}">${url}</a></p>`,
    });
  }

  /**
   * Manda el Aviso de Premio.
   *
   * @throws {Error} el transporte SMTP rechazó el mail
   */
  async sendStreakPrizeNotice(
    email: string,
    clientName: string,
    promised: PromisedPrize,
    expiresAt: Date | null,
    timeZone: string,
    link: string,
  ) {
    const url = `${this.frontendUrl}/turnos/${link}`;
    const until = expiresAt
      ? ` Vale hasta el ${new Intl.DateTimeFormat('es-AR', { dateStyle: 'full', timeZone }).format(expiresAt)}.`
      : '';
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: '¡Ganaste un Premio!',
      html: `<p>¡Hola, ${escapeHtml(clientName)}! Tu Racha te dio un Premio: ${promisedText(promised)}.${until} Pedilo en tu próximo turno. Mirá tu Racha: <a href="${url}">${url}</a></p>`,
    });
  }

  /** One `<li>` per Turno of the Serie: its date, in the zone of the Turno, and its Enlace del Turno. */
  private seriesItems(series: SeriesConfirmation, invite?: ClientInvite) {
    const when = new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'full',
      timeStyle: 'short',
      hourCycle: 'h23',
      timeZone: series.timeZone,
    });
    return series.bookings
      .map(({ startsAt, link }) => {
        const url = `${this.frontendUrl}/turnos/${link}`;
        return `<li>${when.format(startsAt)}: <a href="${url}">${url}</a>${addLinks(invite, link)}</li>`;
      })
      .join('');
  }

  private async sendSeriesMail(
    email: string,
    subject: string,
    text: string,
    reason: string | null | undefined,
    series: SeriesNotice,
    invite?: ClientInvite,
  ) {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject,
      html: `<p>${withReason(text, reason)}. See each one here:</p><ul>${this.seriesItems(series)}</ul>`,
      ...calendarOf(invite),
    });
  }

  /**
   * Avisa en un solo mail las cancelaciones con Causa de un Cliente.
   *
   * @throws el transporte SMTP rechazó el mail
   */
  async sendBookingCancellationWithCause(
    email: string,
    bookings: CausedCancellation[],
    invite?: ClientInvite,
  ) {
    const sameReason = bookings.every((b) => b.reason === bookings[0].reason);
    const items = bookings.map((b) => {
      const url = `${this.frontendUrl}/turnos/${b.link}`;
      const reason = sameReason ? '' : ` ${escapeHtml(b.reason)}`;
      return `<li>${escapeHtml(b.serviceName)} del ${formatWhen(b.startsAt, b.timeZone)}${reason}: <a href="${url}">${url}</a></li>`;
    });
    const intro = sameReason ? `<p>${escapeHtml(bookings[0].reason)}</p>` : '';
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject:
        bookings.length === 1
          ? 'Tu turno fue cancelado'
          : 'Tus turnos fueron cancelados',
      html: `${intro}<ul>${items.join('')}</ul>`,
      ...calendarOf(invite),
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
      html: `<p>Hola ${escapeHtml(clientName)}, se liberó un horario de ${escapeHtml(serviceName)} para el ${day}. Tenes hasta 15 minutos para aceptar o se lo ofrecemos al proximo cliente.<a href="${escapeHtml(bookingUrl)}">${escapeHtml(bookingUrl)}</a></p><p>Si ya no lo necesitás, podés salir de la lista de espera: <a href="${leaveUrl}">${leaveUrl}</a></p>`,
    });
  }

  private async sendBookingMail(
    email: string,
    link: string,
    subject: string,
    text: string,
    invite?: ClientInvite,
    extra = '',
    extraHtml = '',
  ) {
    const url = `${this.frontendUrl}/turnos/${link}`;
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject,
      html: `<p>${text}: <a href="${url}">${url}</a></p>${extra && `<p>${extra.trim()}</p>`}${extraHtml}`,
      ...calendarOf(invite),
    });
  }
}

/** The Sucursal's address and its Cómo llegar: to the point, or to the address when it has none. */
const addressAndDirectionsHtml = ({ address, location }: ConfirmationBranch) => {
  const destination = location
    ? `${location.lat},${location.lng}`
    : encodeURIComponent(address);
  const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  return `<p>${escapeHtml(address)}<br><a href="${escapeHtml(url)}">Cómo llegar</a></p>`;
};

/** Appends the Motivo de cancelación, if any, to a mail text; it is typed by a person, so it goes escaped into the HTML. */
const withReason = (text: string, reason?: string | null) =>
  reason ? `${text}. Reason: ${escapeHtml(reason)}` : text;