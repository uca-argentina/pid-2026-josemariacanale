import { SeriesConfirmation } from '../domain/mailer';
import { PromisedPrize, StreakProgress } from '../domain/streaks/streak-prize';
import { StreakRewardType } from '../domain/streaks/streak-program';
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
    await new NodemailerMailer().sendBookingConfirmation('a@b.com', 'secret', 6, null);

    const { html } = sendMail.mock.calls[0][0];
    expect(html).toContain('6.00');
    expect(html).toContain('http://localhost:3000/turnos/secret');
  });

  it('is unchanged without a Seña nor Sucursal', async () => {
    await new NodemailerMailer().sendBookingConfirmation('a@b.com', 'secret', null, null);

    expect(sendMail.mock.calls[0][0].html).toBe(
      '<p>Your Turno is confirmed. Manage it here: <a href="http://localhost:3000/turnos/secret">http://localhost:3000/turnos/secret</a></p>',
    );
  });

  it('adds the Sucursal address and Cómo llegar to its point', async () => {
    await new NodemailerMailer().sendBookingConfirmation('a@b.com', 'secret', null, {
      address: 'Av. <Corrientes> 1234',
      location: { lat: -34.6037, lng: -58.3816 },
    });

    const { html } = sendMail.mock.calls[0][0];
    expect(html).toContain('Av. &#60;Corrientes&#62; 1234');
    expect(html).toContain(
      '<a href="https://www.google.com/maps/dir/?api=1&#38;destination=-34.6037,-58.3816">Cómo llegar</a>',
    );
  });

  it('points Cómo llegar to the address when the Sucursal has no point', async () => {
    await new NodemailerMailer().sendBookingConfirmation('a@b.com', 'secret', null, {
      address: 'Av. Corrientes 1234, CABA',
      location: null,
    });

    expect(sendMail.mock.calls[0][0].html).toContain(
      'href="https://www.google.com/maps/dir/?api=1&#38;destination=Av.%20Corrientes%201234%2C%20CABA"',
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

  it('lleva la dirección y Cómo llegar una sola vez', async () => {
    await new NodemailerMailer().sendBookingConfirmation(
      'a@b.com',
      'uno',
      null,
      { address: '123 Main St', location: { lat: 1, lng: 2 } },
      {
        timeZone: 'America/Argentina/Buenos_Aires',
        bookings: [
          { startsAt: new Date('2026-01-05T12:00:00Z'), link: 'uno' },
          { startsAt: new Date('2026-01-12T12:00:00Z'), link: 'dos' },
        ],
      },
    );

    const { html } = sendMail.mock.calls[0][0];
    expect(html.split('123 Main St')).toHaveLength(2);
    expect(html.split('Cómo llegar')).toHaveLength(2);
  });

  it('lista en un solo mail cada fecha en la zona del Turno con su Enlace', async () => {
    await new NodemailerMailer().sendBookingConfirmation('a@b.com', 'uno', null, null, {
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

describe('NodemailerMailer.sendBookingConfirmation con la Racha', () => {
  const sendMail = jest.fn().mockResolvedValue(undefined);
  const gift = { type: StreakRewardType.GIFT, value: null, description: 'Un lavado <b>', serviceName: null };
  const send = (streak?: StreakProgress, series?: SeriesConfirmation) =>
    new NodemailerMailer().sendBookingConfirmation('a@b.com', 'secret', null, null, series, streak);
  const html = () => sendMail.mock.calls[0][0].html as string;

  beforeEach(() => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    sendMail.mockClear();
  });

  it('dice los Turnos de la Racha y cuántos faltan para la Recompensa, con el texto escapado', async () => {
    await send({ count: 2, next: { reward: gift, remaining: 3 } });

    expect(html()).toContain('Tu Racha: 2 Turnos. Te faltan 3 para Un lavado &#60;b&#62;.');
  });

  it('en singular dice 1 Turno y Te falta 1', async () => {
    await send({ count: 1, next: { reward: { ...gift, type: StreakRewardType.PERCENT_DISCOUNT, value: 12.5 }, remaining: 1 } });

    expect(html()).toContain('Tu Racha: 1 Turno. Te falta 1 para 12,5% de descuento.');
  });

  it('con la cuenta en 0 invita a empezar la Racha', async () => {
    await send({ count: 0, next: { reward: { ...gift, type: StreakRewardType.FREE_SERVICE, serviceName: 'Corte' }, remaining: 5 } });

    expect(html()).toContain('Empezá tu Racha: con 5 Turnos ganás Corte gratis.');
    expect(html()).not.toContain('Tu Racha:');
  });

  it('sin Recompensa que falte, solo dice la Racha', async () => {
    await send({ count: 7, next: null });

    expect(html()).toContain('Tu Racha: 7 Turnos.');
    expect(html()).not.toContain('Te falta');
  });

  it('sin Racha, el mail es el de siempre', async () => {
    await send();

    expect(html()).not.toContain('Racha');
  });

  it('en la Confirmación de una Serie también va la línea', async () => {
    await send(
      { count: 2, next: { reward: gift, remaining: 3 } },
      { bookings: [{ startsAt: new Date('2026-10-20T01:30:00Z'), link: 'uno' }], timeZone: 'America/Argentina/Buenos_Aires' },
    );

    expect(html()).toContain('Tu Racha: 2 Turnos.');
    expect(html()).toContain('/turnos/uno');
  });
});

describe('NodemailerMailer.sendStreakPrizeNotice', () => {
  const sendMail = jest.fn().mockResolvedValue(undefined);
  const nothing = { value: null, description: null, serviceName: null };
  const send = (promised: PromisedPrize, expiresAt: Date | null = null) =>
    new NodemailerMailer().sendStreakPrizeNotice(
      'a@b.com',
      'Carla <i>',
      promised,
      expiresAt,
      'America/Argentina/Buenos_Aires',
      'secret',
    );

  beforeEach(() => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    sendMail.mockClear();
  });

  it('names the Cliente, escaped, and links the Enlace del Turno', async () => {
    await send({ ...nothing, type: StreakRewardType.GIFT, description: 'Un lavado <b>' });

    const { to, html } = sendMail.mock.calls[0][0];
    expect(to).toBe('a@b.com');
    expect(html).toContain('Carla &#60;i&#62;');
    expect(html).toContain('Un lavado &#60;b&#62;');
    expect(html).toContain('http://localhost:3000/turnos/secret');
    expect(html).not.toContain('Vale hasta');
  });

  it('says the expiry day in the zone of the Turno', async () => {
    await send({ ...nothing, type: StreakRewardType.GIFT, description: 'x' }, new Date('2026-10-20T01:30:00Z'));

    expect(sendMail.mock.calls[0][0].html).toContain('Vale hasta el lunes, 19 de octubre de 2026');
  });

  it.each([
    [{ ...nothing, type: StreakRewardType.PERCENT_DISCOUNT, value: 12.5 }, '12,5% de descuento'],
    [{ ...nothing, type: StreakRewardType.AMOUNT_DISCOUNT, value: 3600 }, '$3.600 de descuento'],
    [{ ...nothing, type: StreakRewardType.FREE_SERVICE, serviceName: 'Corte <b>' }, 'Corte &#60;b&#62; gratis'],
  ])('says what %j promises', async (promised, text) => {
    await send(promised);

    expect(sendMail.mock.calls[0][0].html).toContain(text);
  });
});

describe('NodemailerMailer.sendBookingCancellationWithCause', () => {
  const sendMail = jest.fn().mockResolvedValue(undefined);
  const turno = (over = {}) => ({
    link: 'secret',
    serviceName: 'Corte',
    startsAt: new Date('2026-10-20T01:30:00Z'),
    timeZone: 'America/Argentina/Buenos_Aires',
    reason: 'Ana cambió sus horarios y ya no atiende en ese horario. Podés reservar otro horario.',
    ...over,
  });

  beforeEach(() => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    sendMail.mockClear();
  });

  it('is in Spanish, with the day and hour in the Turno zone and its Enlace del Turno', async () => {
    await new NodemailerMailer().sendBookingCancellationWithCause('a@b.com', [
      turno(),
    ]);

    const { to, subject, html } = sendMail.mock.calls[0][0];
    expect(to).toBe('a@b.com');
    expect(subject).toBe('Tu turno fue cancelado');
    expect(html).toContain('Corte del lunes, 19 de octubre de 2026');
    expect(html).toContain('22:30');
    expect(html).toContain('http://localhost:3000/turnos/secret');
    expect(html).toContain('Ana cambió sus horarios');
  });

  it('escapes the HTML of the Servicio and of the Motivo', async () => {
    await new NodemailerMailer().sendBookingCancellationWithCause('a@b.com', [
      turno({ serviceName: 'Corte <b>', reason: 'Vuelvo <i>pronto</i>' }),
    ]);

    const { html } = sendMail.mock.calls[0][0];
    expect(html).toContain('Corte &#60;b&#62;');
    expect(html).toContain('Vuelvo &#60;i&#62;pronto&#60;/i&#62;');
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('<i>');
  });

  it('lists every Turno with its Enlace and says the Motivo once when they share it', async () => {
    await new NodemailerMailer().sendBookingCancellationWithCause('a@b.com', [
      turno({ link: 'uno' }),
      turno({ link: 'dos', startsAt: new Date('2026-10-21T13:00:00Z') }),
    ]);

    const { subject, html } = sendMail.mock.calls[0][0];
    expect(subject).toBe('Tus turnos fueron cancelados');
    expect(html).toContain('http://localhost:3000/turnos/uno');
    expect(html).toContain('http://localhost:3000/turnos/dos');
    expect(html).toContain('lunes, 19 de octubre de 2026');
    expect(html).toContain('miércoles, 21 de octubre de 2026');
    expect(html.split('Ana cambió sus horarios')).toHaveLength(2);
  });

  it('says the Motivo of each Turno when they differ', async () => {
    await new NodemailerMailer().sendBookingCancellationWithCause('a@b.com', [
      turno({ link: 'uno', reason: 'Ana no atiende por Navidad.' }),
      turno({ link: 'dos', reason: 'Ana no atiende por Año Nuevo.' }),
    ]);

    const { html } = sendMail.mock.calls[0][0];
    expect(html).toContain('Ana no atiende por Navidad.');
    expect(html).toContain('Ana no atiende por Año Nuevo.');
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

describe.each([
  ['sendBookingCancellation', 'were cancelled'],
  ['sendBookingRejection', 'were rejected'],
] as const)('NodemailerMailer.%s de una Serie', (method, wording) => {
  const sendMail = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    sendMail.mockClear();
  });

  it('lists every date, in the zone of the Turno, with its Enlace, and the Motivo de cancelación', async () => {
    await new NodemailerMailer()[method]('a@b.com', 'one', 'Llueve <b>', {
      bookings: [
        { startsAt: new Date('2026-10-19T01:30:00.000Z'), link: 'one' },
        { startsAt: new Date('2026-10-26T01:30:00.000Z'), link: 'two' },
      ],
      timeZone: 'America/Argentina/Buenos_Aires',
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const { to, html } = sendMail.mock.calls[0][0];
    expect(to).toBe('a@b.com');
    expect(html).toContain(`Turnos ${wording}. Reason: Llueve &#60;b&#62;`);
    expect(html).toContain('domingo, 18 de octubre de 2026');
    expect(html).toContain('http://localhost:3000/turnos/one');
    expect(html).toContain('domingo, 25 de octubre de 2026');
    expect(html).toContain('http://localhost:3000/turnos/two');
  });
});

describe('NodemailerMailer.sendBookingAcceptance', () => {
  const sendMail = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    sendMail.mockClear();
  });

  it('says the Turno was accepted, with its Enlace del Turno and the confirmed calendar file', async () => {
    await new NodemailerMailer().sendBookingAcceptance('a@b.com', 'secret', undefined, {
      method: 'REQUEST',
      ics: 'BEGIN:VCALENDAR',
      events: [],
    });

    const mail = sendMail.mock.calls[0][0];
    expect(mail.subject).toBe('Your booking was accepted');
    expect(mail.html).toContain('http://localhost:3000/turnos/secret');
    expect(mail.icalEvent).toEqual({ method: 'REQUEST', content: 'BEGIN:VCALENDAR' });
  });

  it('lists every Turno of a Serie in one mail', async () => {
    await new NodemailerMailer().sendBookingAcceptance('a@b.com', 'one', {
      bookings: [
        { startsAt: new Date('2026-10-19T01:30:00.000Z'), link: 'one' },
        { startsAt: new Date('2026-10-26T01:30:00.000Z'), link: 'two' },
      ],
      timeZone: 'America/Argentina/Buenos_Aires',
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const { html } = sendMail.mock.calls[0][0];
    expect(html).toContain('Turnos were accepted');
    expect(html).toContain('http://localhost:3000/turnos/one');
    expect(html).toContain('http://localhost:3000/turnos/two');
  });
});

describe('NodemailerMailer con archivo de calendario (#404)', () => {
  const sendMail = jest.fn().mockResolvedValue(undefined);
  const invite = (method: 'REQUEST' | 'CANCEL') => ({
    method,
    ics: 'BEGIN:VCALENDAR',
    events: [
      { link: 'secret', googleUrl: 'https://google.test/add', outlookUrl: 'https://outlook.test/add' },
    ],
  });

  beforeEach(() => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    sendMail.mockClear();
  });

  it('attaches the REQUEST and links "Agregar a Google / Outlook" in the Confirmación de reserva', async () => {
    await new NodemailerMailer().sendBookingConfirmation('a@b.com', 'secret', null, null, undefined, undefined, invite('REQUEST'));

    const mail = sendMail.mock.calls[0][0];
    expect(mail.icalEvent).toEqual({ method: 'REQUEST', content: 'BEGIN:VCALENDAR' });
    expect(mail.html).toContain('href="https://google.test/add"');
    expect(mail.html).toContain('href="https://outlook.test/add"');
  });

  it('attaches the CANCEL in the Aviso de cambio del Turno', async () => {
    await new NodemailerMailer().sendBookingCancellation('a@b.com', 'secret', null, undefined, invite('CANCEL'));

    expect(sendMail.mock.calls[0][0].icalEvent).toEqual({ method: 'CANCEL', content: 'BEGIN:VCALENDAR' });
  });

  it('attaches the REQUEST when Reagendar', async () => {
    await new NodemailerMailer().sendBookingReschedule('a@b.com', 'secret', invite('REQUEST'));

    expect(sendMail.mock.calls[0][0].icalEvent.method).toBe('REQUEST');
  });

  it('sends the same mail as before without an archivo de calendario', async () => {
    await new NodemailerMailer().sendBookingReschedule('a@b.com', 'secret');

    expect(sendMail.mock.calls[0][0]).not.toHaveProperty('icalEvent');
  });
});
