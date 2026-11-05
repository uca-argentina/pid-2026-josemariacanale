import { StreakProgramOwner } from './streak-program';
import {
  ClientFileBooking,
  NewStreakPrize,
  StreakPrizeKey,
} from './streak-prize';

/** Injection token for the {@link StreakPrizesRepository} port. */
export const STREAK_PRIZES_REPOSITORY = Symbol('StreakPrizesRepository');

/** The Turnos of the Fichas del Cliente of a program, and their Premios. */
export interface StreakPrizesRepository {
  /**
   * The emails, lowercase, with a Turno atendido of `owner` that started from `from` on and ended before `to`: the only
   * Fichas that can have a Racha alive.
   */
  listEmailsAttendedBetween(
    owner: StreakProgramOwner,
    from: Date,
    to: Date,
  ): Promise<string[]>;
  /** Every Turno of those Fichas, in any casing of the email and without rescheduled originals, ascending by `startsAt`. */
  listClientFileBookings(
    owner: StreakProgramOwner,
    emails: string[],
  ): Promise<ClientFileBooking[]>;
  /** The Premios already granted of those Recompensas to those emails. */
  listGrantedKeys(
    rewardIds: number[],
    emails: string[],
  ): Promise<StreakPrizeKey[]>;
  /** Saves the Premios, skipping those the unique already has; returns only the ones it created. */
  createMany(prizes: NewStreakPrize[]): Promise<NewStreakPrize[]>;
}
