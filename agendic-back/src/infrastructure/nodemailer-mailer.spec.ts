import { createTransport } from 'nodemailer';
import { NodemailerMailer, readFrontendUrl } from './nodemailer-mailer';

jest.mock('nodemailer');


describe('readFrontendUrl', () => {
  it('reads FRONTEND_URL from the environment', () => {
    expect(readFrontendUrl({ FRONTEND_URL: 'http://localhost:3000' })).toBe(
      'http://localhost:3000',
    );
  });

  it('drops a trailing slash, so the Enlace del Turno has no double slash', () => {
    expect(readFrontendUrl({ FRONTEND_URL: 'http://localhost:3000/' })).toBe(
      'http://localhost:3000',
    );
  });

  it('fails naming the variable when it is not set', () => {
    expect(() => readFrontendUrl({})).toThrow('FRONTEND_URL');
  });
});

describe('NodemailerMailer.sendBookingConfirmation', () => {
  const sendMail = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    sendMail.mockClear();
  });

  it('adds the Seña and where to pay it when the Turno has one', async () => {
    await new NodemailerMailer().sendBookingConfirmation('a@b.com', 'secret', 6);

    const { html } = sendMail.mock.calls[0][0];
    expect(html).toContain('6.00');
    expect(html).toContain('http://localhost:3000/turnos/secret');
  });

  it('is unchanged without a Seña', async () => {
    await new NodemailerMailer().sendBookingConfirmation('a@b.com', 'secret', null);

    expect(sendMail.mock.calls[0][0].html).toBe(
      '<p>Your Turno is confirmed. Manage it here: <a href="http://localhost:3000/turnos/secret">http://localhost:3000/turnos/secret</a></p>',
    );
  });
});

describe('NodemailerMailer.sendBookingConfirmation de una Serie', () => {
  const sendMail = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    sendMail.mockClear();
  });

  it('lista en un solo mail cada fecha en la zona del Turno con su Enlace', async () => {
    await new NodemailerMailer().sendBookingConfirmation('a@b.com', 'uno', null, {
      timeZone: 'America/Argentina/Buenos_Aires',
      bookings: [
        { startsAt: new Date('2026-01-05T12:00:00Z'), link: 'uno' },
        { startsAt: new Date('2026-01-12T12:00:00Z'), link: 'dos' },
      ],
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const { html } = sendMail.mock.calls[0][0];
    expect(html).toContain('http://localhost:3000/turnos/uno');
    expect(html).toContain('http://localhost:3000/turnos/dos');
    expect(html).toContain('9:00');
    expect(html.match(/<li>/g)).toHaveLength(2);
  });
});

describe('NodemailerMailer.sendRatingRequest', () => {
  const sendMail = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    sendMail.mockClear();
  });

  it('says the Servicio, the day and hour in the Turno zone, and links the Enlace del Turno', async () => {
    await new NodemailerMailer().sendRatingRequest(
      'a@b.com',
      'secret',
      'Corte <b>',
      new Date('2026-10-20T01:30:00Z'),
      'America/Argentina/Buenos_Aires',
    );

    const { to, html } = sendMail.mock.calls[0][0];
    expect(to).toBe('a@b.com');
    expect(html).toContain('Corte &#60;b&#62;');
    expect(html).toContain('lunes, 19 de octubre de 2026');
    expect(html).toContain('22:30');
    expect(html).toContain('http://localhost:3000/turnos/secret');
  });
});

describe.each([
  ['sendBookingCancellation', 'was cancelled'],
  ['sendBookingRejection', 'was rejected'],
] as const)('NodemailerMailer.%s', (method, wording) => {
  const sendMail = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    sendMail.mockClear();
  });

  it('says the Motivo de cancelación, escaped, when there is one', async () => {
    await new NodemailerMailer()[method]('a@b.com', 'secret', 'Llueve <b>');

    expect(sendMail.mock.calls[0][0].html).toContain(
      `${wording}. Reason: Llueve &#60;b&#62;. See it here`,
    );
  });

  it('is unchanged without a Motivo de cancelación', async () => {
    await new NodemailerMailer()[method]('a@b.com', 'secret', null);

    expect(sendMail.mock.calls[0][0].html).toContain(`${wording}. See it here`);
  });
});
