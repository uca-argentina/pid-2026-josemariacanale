import type { StreakProgram, StreakReward } from '@/src/entities/models/streak-program';

/** Una Recompensa para la pantalla Rachas. */
export const presentStreakReward = ({ id, requiredCount, repeatable, type, value, description, service, validForDays }: StreakReward) => ({
    id,
    requiredCount,
    repeatable,
    type,
    value,
    description,
    service: service && { id: service.id, name: service.name },
    validForDays,
});

/** Las Rachas de un alcance para la pantalla Rachas. */
export const presentStreakProgram = ({ active, burnAfterDays, rewards }: StreakProgram) => ({
    active,
    burnAfterDays,
    rewards: rewards.map(presentStreakReward),
});
