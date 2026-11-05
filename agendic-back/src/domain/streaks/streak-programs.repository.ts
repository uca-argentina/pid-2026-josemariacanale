import {
  OwnedStreakReward,
  StreakProgram,
  StreakProgramOwner,
  StreakProgramSettings,
  StreakReward,
  StreakRewardTerms,
} from './streak-program';

/** Injection token for the {@link StreakProgramsRepository} port. */
export const STREAK_PROGRAMS_REPOSITORY = Symbol('StreakProgramsRepository');

/** Programs of Rachas and their Recompensas; authorization is the use cases' job. */
export interface StreakProgramsRepository {
  /** Null when the owner has no program. */
  findByOwnerIncludeRewards(
    owner: StreakProgramOwner,
  ): Promise<StreakProgram | null>;
  /** Creates the program when there is none; its Recompensas stay as they were. */
  save(
    owner: StreakProgramOwner,
    settings: StreakProgramSettings,
  ): Promise<StreakProgram>;
  /** When the owner has no program, creates it off and without Tiempo de quemada. */
  createReward(
    owner: StreakProgramOwner,
    terms: StreakRewardTerms,
  ): Promise<StreakReward>;
  /** Also finds the borradas. */
  findRewardById(id: number): Promise<OwnedStreakReward | null>;
  /** @throws {NotFoundError} `Streak reward <id> not found`: it no longer exists or was borrada */
  updateReward(id: number, terms: StreakRewardTerms): Promise<StreakReward>;
  /** Sets `deletedAt`, keeping the row. A Recompensa already borrada stays as it was. */
  deleteReward(id: number): Promise<void>;
}
