import { StreakBooking } from './streak';
import type { StreakProgramOwner, StreakRewardType } from './streak-program';

/** What a Premio promises: a copy, so editing the Recompensa does not change a Premio already won. */
export interface PromisedPrize {
  type: StreakRewardType;
  value: number | null;
  description: string | null;
  serviceName: string | null;
}

/** What tells a Premio apart: the same Racha never earns it twice at the same amount of Turnos. */
export interface StreakPrizeKey {
  rewardId: number;
  /** Lowercase. */
  clientEmail: string;
  streakStartedAt: Date;
  reachedCount: number;
}

/** A Premio about to be saved, of the Ficha of `owner` and `clientEmail`. */
export interface NewStreakPrize extends StreakPrizeKey, PromisedPrize {
  owner: StreakProgramOwner;
  grantedAt: Date;
  /** `grantedAt` plus the vigencia of the Recompensa; null when it does not expire. */
  expiresAt: Date | null;
}

/** A Turno of a Ficha del Cliente, with what the Aviso de Premio needs if it is the last of the Racha. */
export interface ClientFileBooking extends StreakBooking {
  /** Lowercase. */
  email: string;
  clientName: string;
  /** Enlace del Turno. */
  link: string | null;
  timeZone: string;
}

/** A Premio as the panel shows it; `redeemedAt` is null while it can still be Canjeado. */
export interface StreakPrize extends PromisedPrize {
  id: number;
  grantedAt: Date;
  expiresAt: Date | null;
  redeemedAt: Date | null;
}

/** A Premio with the Ficha del Cliente it belongs to. */
export interface OwnedStreakPrize extends StreakPrize {
  owner: StreakProgramOwner;
  /** Lowercase. */
  clientEmail: string;
}

/** Copies what a Recompensa promises, as a Premio would. */
export const promisedOf = (reward: {
  type: StreakRewardType;
  value: number | null;
  description: string | null;
  service: { name: string } | null;
}): PromisedPrize => ({
  type: reward.type,
  value: reward.value,
  description: reward.description,
  serviceName: reward.service?.name ?? null,
});

/** Where a Cliente's Racha stands, for the Confirmación de reserva: `next` is null once every Recompensa of "una vez" was reached. */
export interface StreakProgress {
  count: number;
  next: { reward: PromisedPrize; remaining: number } | null;
}
