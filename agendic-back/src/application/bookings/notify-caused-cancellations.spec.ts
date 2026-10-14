import { Mailer } from '../../domain/mailer';
import {
  CausedCancellationNotice,
  notifyCausedCancellations,
} from './notify-caused-cancellations';

const mailer = () =>
  ({ sendBookingCancellationWithCause: jest.fn() }) as unknown as jest.Mocked<Mailer>;

const notice = (
  id: number,
  over: Partial<CausedCancellationNotice> = {},
): CausedCancellationNotice => ({
  clientEmail: `cliente${id}@example.com`,
  link: `link-${id}`,
  serviceName: 'Corte',
  startsAt: new Date(Date.UTC(2031, 0, id, 10)),
  clientTimeZone: 'UTC',
  cancellationReason: 'Vacaciones.',
  ...over,
});

describe('notifyCausedCancellations', () => {
  it('sends one mail per Turno when none belongs to a Serie, even for the same Cliente', async () => {
    const m = mailer();

    await notifyCausedCancellations(m, [notice(1, { clientEmail: 'a@x.com' }), notice(2, { clientEmail: 'a@x.com' })]);

    expect(m.sendBookingCancellationWithCause).toHaveBeenCalledTimes(2);
  });

  it('sends one mail per Serie with all its cancelled dates, and its own mail to a Turno without Serie', async () => {
    const m = mailer();
    const serie = { clientEmail: 'a@x.com', seriesId: 9 };

    await notifyCausedCancellations(m, [
      notice(1, serie),
      notice(2, { clientEmail: 'a@x.com' }),
      notice(3, serie),
    ]);

    expect(m.sendBookingCancellationWithCause).toHaveBeenCalledTimes(2);
    expect(m.sendBookingCancellationWithCause).toHaveBeenCalledWith('a@x.com', [
      expect.objectContaining({ link: 'link-1' }),
      expect.objectContaining({ link: 'link-3' }),
    ]);
    expect(m.sendBookingCancellationWithCause).toHaveBeenCalledWith('a@x.com', [
      expect.objectContaining({ link: 'link-2' }),
    ]);
  });

  it('skips a Turno without Enlace', async () => {
    const m = mailer();

    await notifyCausedCancellations(m, [notice(1, { link: null })]);

    expect(m.sendBookingCancellationWithCause).not.toHaveBeenCalled();
  });

  it('logs a failing mail and still sends the rest', async () => {
    const m = mailer();
    m.sendBookingCancellationWithCause.mockRejectedValueOnce(new Error('smtp down'));

    await expect(notifyCausedCancellations(m, [notice(1), notice(2)])).resolves.toBeUndefined();

    expect(m.sendBookingCancellationWithCause).toHaveBeenCalledTimes(2);
  });
});
