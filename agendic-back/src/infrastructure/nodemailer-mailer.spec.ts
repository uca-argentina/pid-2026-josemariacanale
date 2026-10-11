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
