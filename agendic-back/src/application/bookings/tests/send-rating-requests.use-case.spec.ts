import { BookingStatus, ClientBooking } from '../../../domain/bookings/booking';
import { BookingsRepository } from '../../../domain/bookings/bookings.repository';
import { Mailer } from '../../../domain/mailer';
import { SendRatingRequestsUseCase } from '../send-rating-requests.use-case';

const HOUR = 3_600_000;
const NOW = new Date('2026-10-20T12:00:00Z');
const endedAgo = (ms: number) => new Date(NOW.getTime() - ms);

const booking = (overrides: Partial<ClientBooking> = {}): ClientBooking =>
  ({
    id: 1,
    status: BookingStatus.BOOKED,
    startsAt: endedAgo(3 * HOUR),
    endsAt: endedAgo(2 * HOUR),
    noShowAt: null,
    employeeNoShowAt: null,
    link: 'secret',
    clientEmail: 'ana@example.com',
    timeZone: 'America/Argentina/Buenos_Aires',
    rating: null,
    service: { name: 'Corte' },
    ...overrides,
  }) as ClientBooking;

/** A repository whose pending list drops a Turno once it is marked, like the real query on `ratingRequestSentAt`. */
const setup = (pending: ClientBooking[]) => {
  const sent = new Set<number>();
  const bookings = {
    listUnrequestedByEndsAtBetween: jest.fn(async (from: Date, to: Date) =>
      pending.filter((b) => !sent.has(b.id) && b.endsAt >= from && b.endsAt <= to),
    ),
    markRatingRequestSent: jest.fn(async (id: number) => void sent.add(id)),
  } as unknown as jest.Mocked<BookingsRepository>;
  const mailer = { sendRatingRequest: jest.fn() } as unknown as jest.Mocked<Mailer>;
  const useCase = new SendRatingRequestsUseCase(bookings, mailer, { now: () => NOW });
  return { useCase, bookings, mailer };
};

describe('SendRatingRequestsUseCase', () => {
  it('mails a rateable Turno that ended over an hour ago, and marks it sent', async () => {
    const { useCase, bookings, mailer } = setup([booking()]);

    await useCase.execute();

    expect(mailer.sendRatingRequest).toHaveBeenCalledWith(
      'ana@example.com',
      'secret',
      'Corte',
      expect.any(Date),
      'America/Argentina/Buenos_Aires',
    );
    expect(bookings.markRatingRequestSent).toHaveBeenCalledWith(1, NOW);
  });

  it('asks only for Turnos that ended between 7 days and 1 hour ago', async () => {
    const { useCase, bookings } = setup([]);

    await useCase.execute();

    expect(bookings.listUnrequestedByEndsAtBetween).toHaveBeenCalledWith(
      endedAgo(7 * 24 * HOUR),
      endedAgo(HOUR),
    );
  });

  it('does not mail before the hour or after the 7 days', async () => {
    const { useCase, mailer } = setup([
      booking({ id: 1, endsAt: endedAgo(HOUR / 2) }),
      booking({ id: 2, endsAt: endedAgo(8 * 24 * HOUR) }),
    ]);

    await useCase.execute();

    expect(mailer.sendRatingRequest).not.toHaveBeenCalled();
  });

  it('does not mail twice', async () => {
    const { useCase, mailer } = setup([booking()]);

    await useCase.execute();
    await useCase.execute();

    expect(mailer.sendRatingRequest).toHaveBeenCalledTimes(1);
  });

  it('does not mark a Turno whose mail failed, so the next pass retries it', async () => {
    const { useCase, bookings, mailer } = setup([booking()]);
    mailer.sendRatingRequest.mockRejectedValueOnce(new Error('smtp down'));

    await useCase.execute();
    expect(bookings.markRatingRequestSent).not.toHaveBeenCalled();

    await useCase.execute();
    expect(mailer.sendRatingRequest).toHaveBeenCalledTimes(2);
    expect(bookings.markRatingRequestSent).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['Ausencia del Invitado', { noShowAt: endedAgo(HOUR) }],
    ['Ausencia del Anfitrión', { employeeNoShowAt: endedAgo(HOUR) }],
    ['ya calificado', { rating: { score: 5, comment: null, createdAt: NOW } }],
    ['Cancelado', { status: BookingStatus.CANCELLED }],
    ['pendiente', { status: BookingStatus.PENDING }],
    ['sin Enlace', { link: null }],
  ])('does not mail a Turno %s', async (_name, overrides) => {
    const { useCase, mailer } = setup([booking(overrides)]);

    await useCase.execute();

    expect(mailer.sendRatingRequest).not.toHaveBeenCalled();
  });
});
