import {
  StreakProgram,
  StreakReward,
} from '../../domain/streaks/streak-program';

/** A Recompensa as the panel sees it: `deletedAt` and the program's owner stay internal. */
export const presentStreakReward = (reward: StreakReward) => ({
  id: reward.id,
  requiredCount: reward.requiredCount,
  repeatable: reward.repeatable,
  type: reward.type,
  value: reward.value,
  description: reward.description,
  service: reward.service,
  validForDays: reward.validForDays,
});

/** The program as the "Rachas" screen sees it. */
export const presentStreakProgram = (program: StreakProgram) => ({
  active: program.active,
  burnAfterDays: program.burnAfterDays,
  rewards: program.rewards.map(presentStreakReward),
});
