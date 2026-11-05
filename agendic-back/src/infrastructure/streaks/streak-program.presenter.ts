import { BookingStreak } from '../../application/streaks/get-booking-streak.use-case';
import { StreakPrize } from '../../domain/streaks/streak-prize';
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

/** A Premio as the Empleado sees it; `redeemedAt` is null until it is Canjeado. */
export const presentStreakPrize = (prize: StreakPrize) => ({
  id: prize.id,
  type: prize.type,
  value: prize.value,
  description: prize.description,
  serviceName: prize.serviceName,
  grantedAt: prize.grantedAt,
  expiresAt: prize.expiresAt,
});

/** The Racha block of the detail of a Turno; `nextReward` carries the Recompensa as the program shows it. */
export const presentBookingStreak = ({ streak, nextReward, prizes }: BookingStreak) => ({
  streak,
  nextReward: nextReward && {
    reward: presentStreakReward(nextReward.reward),
    remaining: nextReward.remaining,
  },
  prizes: prizes.map(presentStreakPrize),
});
