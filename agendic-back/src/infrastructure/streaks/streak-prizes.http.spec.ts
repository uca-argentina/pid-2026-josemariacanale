import { Logger } from '@nestjs/common';
import { GrantStreakPrizesUseCase } from '../../application/streaks/grant-streak-prizes.use-case';
import { BookingStatus } from '../../domain/bookings/booking';
import {
  ActiveStreakProgram,
  StreakProgramOwner,
  StreakRewardType,
} from '../../domain/streaks/streak-program';
import { FichaBooking, NewStreakPrize } from '../../domain/streaks/streak-prize';
import { createTestApp, TestApp } from '../../test-app';

const DAY_MS = 86_400_000;
const NOW = new Date('2026-03-01T12:00:00.000Z');
const EMAIL = 'carla@example.com';
const OF_BUSINESS: StreakProgramOwner = { kind: 'business', businessId: 3 };
const TIME_ZONE = 'America/Argentina/Buenos_Aires';

/** A Turno atendido that started `days` days before NOW. */
const turno = (days: number, over: Partial<FichaBooking> = {}): FichaBooking => {
  const startsAt = new Date(NOW.getTime() - days * DAY_MS);
  return {
    email: EMAIL,
    clientName: 'Carla',
    link: `link-${days}`,
    timeZone: TIME_ZONE,
    startsAt,
    endsAt: new Date(startsAt.getTime() + 3_600_000),
    status: BookingStatus.BOOKED,
    noShowAt: null,
    employeeNoShowAt: null,
    ...over,
  };
};

const gift = (over: Partial<ActiveStreakProgram['rewards'][number]> = {}) => ({
  id: 7,
  requiredCount: 3,
  repeatable: false,
  type: StreakRewardType.GIFT,
  value: null,
  description: 'Un lavado',
  serviceName: null,
  validForDays: null,
  ...over,
});

const program = (over: Partial<ActiveStreakProgram> = {}): ActiveStreakProgram => ({
  owner: OF_BUSINESS,
  burnAfterDays: 30,
  rewards: [gift()],
  ...over,
});

describe('GrantStreakPrizesUseCase', () => {
  let t: TestApp;
  let run: () => Promise<void>;
  /** The Premios saved so far: what the unique of the table would keep. */
  let saved: NewStreakPrize[];

  const stubFicha = (bookings: FichaBooking[], emails = [EMAIL]) => {
    t.streakPrizes.listEmailsAttendedBetween.mockResolvedValue(emails);
    t.streakPrizes.listFichaBookings.mockResolvedValue(bookings);
  };
  const reachedCounts = () => saved.map((p) => p.reachedCount);
  const setClock = (date: Date) => t.clock.advance(date.getTime() - t.clock.now().getTime());

  beforeEach(async () => {
    t = await createTestApp();
    setClock(NOW);
    const useCase = t.app.get(GrantStreakPrizesUseCase, { strict: false });
    run = () => useCase.execute();
    saved = [];
    t.streakPrograms.listActiveIncludeRewards.mockResolvedValue([program()]);
    t.streakPrizes.listGrantedKeys.mockImplementation(async () =>
      saved.map(({ rewardId, clientEmail, streakStartedAt, reachedCount }) => ({
        rewardId,
        clientEmail,
        streakStartedAt,
        reachedCount,
      })),
    );
    t.streakPrizes.createMany.mockImplementation(async (prizes) => {
      saved.push(...prizes);
      return prizes;
    });
    t.mailer.sendStreakPrizeNotice.mockResolvedValue();
  });
  afterEach(() => t.app.close());

  it('llega a la Recompensa: guarda el Premio con la copia de lo prometido y manda el Aviso del último Turno', async () => {
    stubFicha([turno(40), turno(20), turno(10, { clientName: 'Carla Gómez', link: 'ultimo' })]);
    t.streakPrograms.listActiveIncludeRewards.mockResolvedValue([
      program({ rewards: [gift({ validForDays: 10 })] }),
    ]);

    await run();

    const expiresAt = new Date(NOW.getTime() + 10 * DAY_MS);
    expect(t.streakPrizes.createMany).toHaveBeenCalledWith([
      {
        rewardId: 7,
        owner: OF_BUSINESS,
        clientEmail: EMAIL,
        streakStartedAt: turno(40).startsAt,
        reachedCount: 3,
        type: StreakRewardType.GIFT,
        value: null,
        description: 'Un lavado',
        serviceName: null,
        grantedAt: NOW,
        expiresAt,
      },
    ]);
    expect(t.mailer.sendStreakPrizeNotice).toHaveBeenCalledTimes(1);
    expect(t.mailer.sendStreakPrizeNotice).toHaveBeenCalledWith(
      EMAIL,
      'Carla Gómez',
      { type: StreakRewardType.GIFT, value: null, description: 'Un lavado', serviceName: null },
      expiresAt,
      TIME_ZONE,
      'ultimo',
    );
  });

  it('no alcanza la cantidad: ningún Premio', async () => {
    stubFicha([turno(20), turno(10)]);

    await run();

    expect(t.streakPrizes.createMany).not.toHaveBeenCalled();
    expect(t.mailer.sendStreakPrizeNotice).not.toHaveBeenCalled();
  });

  it('re-ejecutar no duplica el Premio ni el Aviso', async () => {
    stubFicha([turno(30), turno(20), turno(10)]);

    await run();
    await run();

    expect(saved).toHaveLength(1);
    expect(t.mailer.sendStreakPrizeNotice).toHaveBeenCalledTimes(1);
  });

  it('si otra pasada ganó la carrera por el unique, no manda otro Aviso', async () => {
    stubFicha([turno(30), turno(20), turno(10)]);
    t.streakPrizes.createMany.mockResolvedValue([]);

    await run();

    expect(t.mailer.sendStreakPrizeNotice).not.toHaveBeenCalled();
  });

  it('se quema por tiempo: un Turno a más del Tiempo de quemada del anterior empieza otra Racha', async () => {
    stubFicha([turno(80), turno(70), turno(39), turno(5)]);

    await run();

    expect(t.streakPrizes.createMany).not.toHaveBeenCalled();
  });

  it('el Tiempo de quemada exacto todavía continúa la Racha', async () => {
    stubFicha([turno(60), turno(30), turno(0.5)]);
    t.streakPrograms.listActiveIncludeRewards.mockResolvedValue([program({ burnAfterDays: 30 })]);

    await run();

    expect(reachedCounts()).toEqual([3]);
  });

  it('una Racha que ya se quemó no da Premios aunque haya llegado a la cantidad', async () => {
    stubFicha([turno(62), turno(52), turno(42)]);

    await run();

    expect(t.streakPrizes.createMany).not.toHaveBeenCalled();
  });

  it('se quema por Ausencia del Invitado: la Racha arranca de nuevo después de ella', async () => {
    stubFicha([turno(40), turno(30), turno(20, { noShowAt: NOW }), turno(10)]);

    await run();

    expect(t.streakPrizes.createMany).not.toHaveBeenCalled();
  });

  it('una Ausencia del Invitado como último Turno deja la Racha en cero', async () => {
    stubFicha([turno(30), turno(20), turno(15), turno(10, { noShowAt: NOW })]);

    await run();

    expect(t.streakPrizes.createMany).not.toHaveBeenCalled();
  });

  it.each([
    ['Cancelado', { status: BookingStatus.CANCELLED }],
    ['Rechazado', { status: BookingStatus.REJECTED }],
    ['con Ausencia del Anfitrión', { employeeNoShowAt: NOW }],
  ])('un Turno %s no suma ni quema', async (_case, over) => {
    stubFicha([turno(30), turno(25, over), turno(20)]);
    await run();
    expect(t.streakPrizes.createMany).not.toHaveBeenCalled();

    stubFicha([turno(30), turno(25, over), turno(20), turno(10)]);
    await run();
    expect(reachedCounts()).toEqual([3]);
  });

  it.each([
    ['pendiente que ya pasó', { status: BookingStatus.PENDING }],
    ['que todavía no terminó', { endsAt: new Date(NOW.getTime() + 60_000) }],
  ])('un Turno %s no suma', async (_case, over) => {
    stubFicha([turno(30), turno(20), turno(10, over)]);

    await run();

    expect(t.streakPrizes.createMany).not.toHaveBeenCalled();
  });

  it('una Ausencia desmarcada repone la Racha', async () => {
    stubFicha([turno(30), turno(20, { noShowAt: NOW }), turno(10)]);
    await run();
    expect(saved).toHaveLength(0);

    stubFicha([turno(30), turno(20), turno(10)]);
    await run();

    expect(saved).toEqual([expect.objectContaining({ streakStartedAt: turno(30).startsAt, reachedCount: 3 })]);
  });

  it('repetible: un Premio a los 5 y otro a los 10 Turnos, y solo el nuevo al llegar a 10', async () => {
    t.streakPrograms.listActiveIncludeRewards.mockResolvedValue([
      program({ rewards: [gift({ requiredCount: 5, repeatable: true })] }),
    ]);
    const days = [20, 18, 16, 14, 12, 10, 8, 6, 4, 2];

    stubFicha(days.slice(0, 7).map((d) => turno(d)));
    await run();
    expect(reachedCounts()).toEqual([5]);

    stubFicha(days.map((d) => turno(d)));
    await run();
    expect(reachedCounts()).toEqual([5, 10]);
    expect(t.mailer.sendStreakPrizeNotice).toHaveBeenCalledTimes(2);
  });

  it('"una vez" da un solo Premio aunque la Racha siga creciendo', async () => {
    stubFicha([turno(25), turno(20), turno(15), turno(10), turno(5)]);

    await run();

    expect(reachedCounts()).toEqual([3]);
  });

  it('"una vez" se vuelve a ganar en una Racha nueva', async () => {
    const first = [turno(100), turno(90), turno(80)];
    stubFicha(first);
    setClock(new Date(NOW.getTime() - 79 * DAY_MS));
    await run();
    expect(saved).toHaveLength(1);

    setClock(NOW);
    stubFicha([...first, turno(30), turno(20), turno(10)]);
    await run();

    expect(saved.map((p) => p.streakStartedAt)).toEqual([turno(100).startsAt, turno(30).startsAt]);
  });

  it('una Recompensa nueva la gana una Racha en curso que ya pasó su cantidad, un Premio por múltiplo', async () => {
    t.streakPrograms.listActiveIncludeRewards.mockResolvedValue([
      program({ rewards: [gift({ id: 8, requiredCount: 5, repeatable: true })] }),
    ]);
    stubFicha([24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2].map((d) => turno(d)));

    await run();

    expect(reachedCounts()).toEqual([5, 10]);
  });

  it('programa apagado o sin Recompensas: el repositorio no lo lista y no hay Premios', async () => {
    t.streakPrograms.listActiveIncludeRewards.mockResolvedValue([]);

    await run();

    expect(t.streakPrizes.listEmailsAttendedBetween).not.toHaveBeenCalled();
    expect(t.streakPrizes.createMany).not.toHaveBeenCalled();
  });

  it('busca las Fichas con un Turno atendido dentro del último Tiempo de quemada', async () => {
    t.streakPrizes.listEmailsAttendedBetween.mockResolvedValue([]);

    await run();

    expect(t.streakPrizes.listEmailsAttendedBetween).toHaveBeenCalledWith(
      OF_BUSINESS,
      new Date(NOW.getTime() - 30 * DAY_MS),
      NOW,
    );
    expect(t.streakPrizes.listFichaBookings).not.toHaveBeenCalled();
  });

  it('el mail falla: se loguea, el Premio queda y los demás Avisos salen', async () => {
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    t.mailer.sendStreakPrizeNotice.mockRejectedValueOnce(new Error('SMTP down'));
    stubFicha(
      [turno(30), turno(20), turno(10), ...[30, 20, 10].map((d) => turno(d, { email: 'dani@example.com' }))],
      [EMAIL, 'dani@example.com'],
    );

    await run();

    expect(saved).toHaveLength(2);
    expect(t.mailer.sendStreakPrizeNotice).toHaveBeenCalledTimes(2);
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it('un Premio sin Enlace del Turno queda guardado, sin Aviso', async () => {
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    stubFicha([turno(30), turno(20), turno(10, { link: null })]);

    await run();

    expect(saved).toHaveLength(1);
    expect(t.mailer.sendStreakPrizeNotice).not.toHaveBeenCalled();
    logged.mockRestore();
  });

  it('un programa que falla se loguea y no frena a los demás', async () => {
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    t.streakPrograms.listActiveIncludeRewards.mockResolvedValue([
      program(),
      program({ owner: { kind: 'personal', userId: 9 } }),
    ]);
    t.streakPrizes.listEmailsAttendedBetween.mockRejectedValueOnce(new Error('boom')).mockResolvedValue([EMAIL]);
    t.streakPrizes.listFichaBookings.mockResolvedValue([turno(30), turno(20), turno(10)]);

    await run();

    expect(saved).toEqual([expect.objectContaining({ owner: { kind: 'personal', userId: 9 } })]);
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it('Fichas separadas: cada email y cada programa cuentan aparte', async () => {
    const personal: StreakProgramOwner = { kind: 'personal', userId: 9 };
    t.streakPrograms.listActiveIncludeRewards.mockResolvedValue([program(), program({ owner: personal })]);
    t.streakPrizes.listEmailsAttendedBetween.mockImplementation(async (owner) =>
      owner.kind === 'business' ? [EMAIL, 'dani@example.com'] : [EMAIL],
    );
    t.streakPrizes.listFichaBookings.mockImplementation(async (owner) =>
      owner.kind === 'business'
        ? [turno(30), turno(25, { email: 'dani@example.com' }), turno(20), turno(15, { email: 'dani@example.com' }), turno(10)]
        : [turno(12), turno(11)],
    );

    await run();

    expect(saved).toEqual([expect.objectContaining({ owner: OF_BUSINESS, clientEmail: EMAIL, reachedCount: 3 })]);
  });

  it('mira los Premios ya ganados solo de las Recompensas y los emails del programa', async () => {
    stubFicha([turno(30), turno(20), turno(10)]);

    await run();

    expect(t.streakPrizes.listGrantedKeys).toHaveBeenCalledWith([7], [EMAIL]);
    expect(t.streakPrizes.listFichaBookings).toHaveBeenCalledWith(OF_BUSINESS, [EMAIL]);
  });
});
