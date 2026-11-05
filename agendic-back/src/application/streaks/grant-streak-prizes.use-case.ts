import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { MAILER, Mailer } from '../../domain/mailer';
import { currentStreak, earnedCounts, Streak } from '../../domain/streaks/streak';
import {
  FichaBooking,
  NewStreakPrize,
  StreakPrizeKey,
} from '../../domain/streaks/streak-prize';
import {
  ActiveStreakProgram,
  GrantableStreakReward,
} from '../../domain/streaks/streak-program';
import {
  STREAK_PROGRAMS_REPOSITORY,
  StreakProgramsRepository,
} from '../../domain/streaks/streak-programs.repository';
import {
  STREAK_PRIZES_REPOSITORY,
  StreakPrizesRepository,
} from '../../domain/streaks/streak-prizes.repository';

const DAY_MS = 86_400_000;

const logger = new Logger('GrantStreakPrizes');

const keyOf = ({ rewardId, clientEmail, streakStartedAt, reachedCount }: StreakPrizeKey) =>
  `${rewardId}|${clientEmail}|${streakStartedAt.getTime()}|${reachedCount}`;

const groupByEmail = (bookings: FichaBooking[]) => {
  const byEmail = new Map<string, FichaBooking[]>();
  for (const booking of bookings) {
    const ficha = byEmail.get(booking.email);
    if (ficha) ficha.push(booking);
    else byEmail.set(booking.email, [booking]);
  }
  return byEmail;
};

const prizesEarned = (
  { owner, rewards }: ActiveStreakProgram,
  email: string,
  streak: Streak<FichaBooking>,
  now: Date,
) =>
  rewards.flatMap((reward: GrantableStreakReward): NewStreakPrize[] =>
    earnedCounts(reward, streak.count).map((reachedCount) => ({
      rewardId: reward.id,
      owner,
      clientEmail: email,
      streakStartedAt: streak.startedAt,
      reachedCount,
      type: reward.type,
      value: reward.value,
      description: reward.description,
      serviceName: reward.serviceName,
      grantedAt: now,
      expiresAt:
        reward.validForDays === null
          ? null
          : new Date(now.getTime() + reward.validForDays * DAY_MS),
    })),
  );

/**
 * Da los Premios que les faltan a las Rachas en curso, y avisa por mail de cada uno. Recalcular cubre de una vez los
 * Turnos que acaban de terminar, las Recompensas nuevas y una Ausencia del Invitado desmarcada; un Premio no se borra
 * nunca por recalcular.
 *
 * Un programa que falla se loguea y se reintenta en la próxima pasada, sin frenar a los demás. Un mail que falla se
 * loguea y no se reintenta: el Premio queda.
 */
@Injectable()
export class GrantStreakPrizesUseCase {
  constructor(
    @Inject(STREAK_PROGRAMS_REPOSITORY)
    private readonly programs: StreakProgramsRepository,
    @Inject(STREAK_PRIZES_REPOSITORY)
    private readonly prizes: StreakPrizesRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Una pasada por todos los programas activos.
   *
   * @throws {DatabaseOperationError} falló la base al buscar los programas
   */
  async execute(): Promise<void> {
    const now = this.clock.now();
    for (const program of await this.programs.listActiveIncludeRewards()) {
      try {
        await this.grantProgram(program, now);
      } catch (error) {
        logger.error(
          `Premios of ${JSON.stringify(program.owner)} failed`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private async grantProgram(program: ActiveStreakProgram, now: Date) {
    const emails = await this.prizes.listEmailsAttendedBetween(
      program.owner,
      new Date(now.getTime() - program.burnAfterDays * DAY_MS),
      now,
    );
    if (emails.length === 0) return;

    const fichas = groupByEmail(
      await this.prizes.listFichaBookings(program.owner, emails),
    );
    const lastOf = new Map<string, FichaBooking>();
    const earned: NewStreakPrize[] = [];
    for (const [email, bookings] of fichas) {
      const streak = currentStreak(bookings, program.burnAfterDays, now);
      if (!streak) continue;
      lastOf.set(email, streak.last);
      earned.push(...prizesEarned(program, email, streak, now));
    }
    if (earned.length === 0) return;

    // Asking first, instead of leaving it all to the unique: every skipped insert would still burn an id of the
    // sequence, on every pass, for every Premio already won.
    const granted = await this.prizes.listGrantedKeys(
      program.rewards.map(({ id }) => id),
      emails,
    );
    const known = new Set(granted.map(keyOf));
    const missing = earned.filter((prize) => !known.has(keyOf(prize)));
    if (missing.length === 0) return;

    for (const prize of await this.prizes.createMany(missing)) {
      await this.notify(prize, lastOf.get(prize.clientEmail) as FichaBooking);
    }
  }

  private async notify(prize: NewStreakPrize, last: FichaBooking) {
    if (last.link === null) return;
    const { type, value, description, serviceName } = prize;
    try {
      await this.mailer.sendStreakPrizeNotice(
        prize.clientEmail,
        last.clientName,
        { type, value, description, serviceName },
        prize.expiresAt,
        last.timeZone,
        last.link,
      );
    } catch (error) {
      logger.error(
        `Aviso de Premio of Recompensa ${prize.rewardId} for a Racha of ${prize.reachedCount} failed`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
