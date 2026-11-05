import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  currentStreak,
  NextReward,
  nextReward,
} from '../../domain/streaks/streak';
import {
  promisedOf,
  StreakPrize,
  StreakProgress,
} from '../../domain/streaks/streak-prize';
import {
  STREAK_PRIZES_REPOSITORY,
  StreakPrizesRepository,
} from '../../domain/streaks/streak-prizes.repository';
import {
  STREAK_PROGRAMS_REPOSITORY,
  StreakProgramsRepository,
} from '../../domain/streaks/streak-programs.repository';
import { StreakProgramOwner, StreakReward } from '../../domain/streaks/streak-program';

const logger = new Logger('ClientFileStreakReader');

/** The Racha of the Cliente of a Ficha, what is left to the next Recompensa and the Premios they can still be given. */
export interface ClientFileStreak {
  /** Null when the program is off, has no Recompensas or no Tiempo de quemada; `burnsAt` is null when the Cliente has no Racha in course. */
  streak: { count: number; burnsAt: Date | null } | null;
  nextReward: NextReward<StreakReward> | null;
  /** Available ones, the oldest first, even with the program off: they were already promised. */
  prizes: StreakPrize[];
}

/** Lee la Racha de una Ficha del Cliente; la comparten el detalle del Turno, el Enlace del Turno y la Confirmación de reserva. */
@Injectable()
export class ClientFileStreakReader {
  constructor(
    @Inject(STREAK_PROGRAMS_REPOSITORY)
    private readonly programs: StreakProgramsRepository,
    @Inject(STREAK_PRIZES_REPOSITORY)
    private readonly prizes: StreakPrizesRepository,
  ) {}

  /**
   * Lee la Racha de la Ficha del Cliente de un Turno: su Negocio, o el Usuario de un Servicio personal.
   *
   * @throws {NotFoundError} el Turno no existe
   * @throws {DatabaseOperationError} falló la base
   */
  async readOfBooking(
    bookingId: number,
    clientEmail: string,
    now: Date,
  ): Promise<ClientFileStreak> {
    return this.read(
      await this.prizes.findOwnerByBookingId(bookingId),
      clientEmail,
      now,
    );
  }

  /**
   * Lee la Racha de la Ficha de `clientEmail` en `owner`, sin distinguir mayúsculas.
   *
   * @throws {DatabaseOperationError} falló la base
   */
  async read(
    owner: StreakProgramOwner,
    clientEmail: string,
    now: Date,
  ): Promise<ClientFileStreak> {
    const email = clientEmail.toLowerCase();
    const [prizes, program] = await Promise.all([
      this.prizes.listAvailable(owner, email, now),
      this.programs.findByOwnerIncludeRewards(owner),
    ]);
    if (
      !program?.active ||
      program.burnAfterDays === null ||
      program.rewards.length === 0
    )
      return { streak: null, nextReward: null, prizes };

    const streak = currentStreak(
      await this.prizes.listClientFileBookings(owner, [email]),
      program.burnAfterDays,
      now,
    );
    const count = streak?.count ?? 0;
    return {
      streak: { count, burnsAt: streak?.burnsAt ?? null },
      nextReward: nextReward(program.rewards, count),
      prizes,
    };
  }

  /**
   * Where the Racha of the Cliente of a just created Turno stands, for its Confirmación de reserva; undefined with the
   * program off. The Turno is saved already, so a failure is logged and the mail goes without the line.
   */
  async progressOfBooking(
    bookingId: number,
    clientEmail: string,
    now: Date,
  ): Promise<StreakProgress | undefined> {
    try {
      const { streak, nextReward: next } = await this.readOfBooking(bookingId, clientEmail, now);
      if (!streak) return undefined;
      return {
        count: streak.count,
        next: next && { reward: promisedOf(next.reward), remaining: next.remaining },
      };
    } catch (error) {
      logger.error(
        `Racha of Turno ${bookingId} for its Confirmación de reserva failed`,
        error instanceof Error ? error.stack : String(error),
      );
      return undefined;
    }
  }
}
