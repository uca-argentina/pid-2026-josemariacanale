import { StreakProgramOwner } from './streak-program';
import {
  ClientFileBooking,
  NewStreakPrize,
  OwnedStreakPrize,
  StreakPrize,
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
  /**
   * The Ficha del Cliente a Turno belongs to: its Negocio, or the Usuario of a Servicio personal.
   *
   * @throws {NotFoundError} the Turno does not exist
   */
  findOwnerByBookingId(bookingId: number): Promise<StreakProgramOwner>;
  /** The Premios of a Ficha that are neither Canjeados nor vencidos at `now`, the oldest first. */
  listAvailable(
    owner: StreakProgramOwner,
    clientEmail: string,
    now: Date,
  ): Promise<StreakPrize[]>;
  /** Null when there is no such Premio. */
  findById(id: number): Promise<OwnedStreakPrize | null>;
  /**
   * Canjea el Premio en el Turno, solo si sigue sin Canjear en el momento de escribir.
   *
   * @throws {ConflictError} the Premio was already Canjeado
   */
  redeem(
    id: number,
    bookingId: number,
    userId: number,
    now: Date,
  ): Promise<StreakPrize>;
  /** Saves the Premios, skipping those the unique already has; returns only the ones it created. */
  createMany(prizes: NewStreakPrize[]): Promise<NewStreakPrize[]>;
}
