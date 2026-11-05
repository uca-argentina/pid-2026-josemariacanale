import { ClientFileStreak } from '../../application/streaks/client-file-streak.reader';
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

const presentNextReward = (nextReward: ClientFileStreak['nextReward']) =>
  nextReward && {
    reward: presentStreakReward(nextReward.reward),
    remaining: nextReward.remaining,
  };

/** The Racha block of the detail of a Turno; `nextReward` carries the Recompensa as the program shows it. */
export const presentBookingStreak = ({ streak, nextReward, prizes }: ClientFileStreak) => ({
  streak,
  nextReward: presentNextReward(nextReward),
  prizes: prizes.map(presentStreakPrize),
});

/**
 * The Racha as the Enlace del Turno shows it: null when the program is off or the Cliente has nothing to show, a Racha
 * of 0 Turnos and no Premios disponibles.
 */
export const presentLinkStreak = ({ streak, nextReward, prizes }: ClientFileStreak) =>
  !streak || (streak.count === 0 && prizes.length === 0)
    ? null
    : {
        count: streak.count,
        burnsAt: streak.burnsAt,
        nextReward: presentNextReward(nextReward),
        prizes: prizes.map(presentStreakPrize),
      };
