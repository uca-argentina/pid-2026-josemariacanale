import { BadRequestError } from '../errors';

/** The shortest and longest Tiempo de quemada, in days. */
export const MIN_BURN_AFTER_DAYS = 1;
export const MAX_BURN_AFTER_DAYS = 365;

/** The longest a regalo's text can be. */
export const MAX_GIFT_DESCRIPTION_LENGTH = 200;

/** What a Recompensa promises. Agendic doesn't charge (ADR 0027): discounts and free Servicios are informative. */
export enum StreakRewardType {
  PERCENT_DISCOUNT = 'PERCENT_DISCOUNT',
  AMOUNT_DISCOUNT = 'AMOUNT_DISCOUNT',
  GIFT = 'GIFT',
  FREE_SERVICE = 'FREE_SERVICE',
}

/** Whose Rachas a program holds: a Negocio's, or those of a Usuario's Servicios personales. */
export type StreakProgramOwner =
  | { kind: 'business'; businessId: number }
  | { kind: 'personal'; userId: number };

/** What the Dueño, or the Usuario in the personales, fixes on a program. */
export interface StreakProgramSettings {
  active: boolean;
  /** Tiempo de quemada. */
  burnAfterDays: number;
}

/** A Recompensa's fields as stored: the ones not of its type are null. */
export interface StreakRewardTerms {
  requiredCount: number;
  /** True: every `requiredCount` Turnos of the Racha. False: once per Racha. */
  repeatable: boolean;
  type: StreakRewardType;
  value: number | null;
  description: string | null;
  serviceId: number | null;
  validForDays: number | null;
}

/** Recompensa: what is earned on reaching `requiredCount` Turnos of the Racha. */
export interface StreakReward extends Omit<StreakRewardTerms, 'serviceId'> {
  id: number;
  /** The free Servicio, even once dado de baja. */
  service: { id: number; name: string } | null;
}

/** A Recompensa with what authorizing it needs. */
export interface OwnedStreakReward extends StreakReward {
  owner: StreakProgramOwner;
  /** Set once borrada; the row stays as history. */
  deletedAt: Date | null;
}

/** The Rachas configuration of a Negocio or of a Usuario's Servicios personales. */
export interface StreakProgram {
  active: boolean;
  /** Null while nobody fixed it: creating a Recompensa creates the program without one. */
  burnAfterDays: number | null;
  /** Without the borradas, ascending by `requiredCount`. */
  rewards: StreakReward[];
}

/** What a Negocio or a Usuario that never touched their Rachas has. */
export const NO_STREAK_PROGRAM: StreakProgram = {
  active: false,
  burnAfterDays: null,
  rewards: [],
};

/**
 * Checks the field a Recompensa's type asks for, and nulls the ones of the other types.
 *
 * @throws {BadRequestError} the field of the type is missing or out of range
 */
export const streakRewardTerms = (
  terms: StreakRewardTerms,
): StreakRewardTerms => {
  const only = { ...terms, value: null, description: null, serviceId: null };
  switch (terms.type) {
    case StreakRewardType.PERCENT_DISCOUNT:
      if (terms.value === null || terms.value < 1 || terms.value > 100)
        throw new BadRequestError(
          `A PERCENT_DISCOUNT needs a value between 1 and 100, got ${terms.value}`,
        );
      return { ...only, value: terms.value };
    case StreakRewardType.AMOUNT_DISCOUNT:
      if (terms.value === null || terms.value <= 0)
        throw new BadRequestError(
          `An AMOUNT_DISCOUNT needs a value above 0, got ${terms.value}`,
        );
      return { ...only, value: terms.value };
    case StreakRewardType.GIFT: {
      const description = terms.description?.trim();
      if (!description || description.length > MAX_GIFT_DESCRIPTION_LENGTH)
        throw new BadRequestError(
          `A GIFT needs a description of 1 to ${MAX_GIFT_DESCRIPTION_LENGTH} characters`,
        );
      return { ...only, description };
    }
    case StreakRewardType.FREE_SERVICE:
      if (terms.serviceId === null)
        throw new BadRequestError('A FREE_SERVICE needs a serviceId');
      return { ...only, serviceId: terms.serviceId };
  }
};
