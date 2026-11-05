import { z } from 'zod';

/** El Tiempo de quemada admitido, en días, como lo valida el back. */
export const BURN_AFTER_DAYS_MIN = 1;
export const BURN_AFTER_DAYS_MAX = 365;
/** El largo máximo del texto de un regalo. */
export const GIFT_DESCRIPTION_MAX = 200;
/** Lo más que entra en el `value` de una Recompensa, un Decimal(10, 2) en el back. */
export const REWARD_VALUE_MAX = 99_999_999.99;
// An int4 in the back: above this it answers a 500, not a 400.
const POSITIVE_INT_MAX = 2_147_483_647;

export const STREAK_REWARD_TYPES = ['PERCENT_DISCOUNT', 'AMOUNT_DISCOUNT', 'GIFT', 'FREE_SERVICE'] as const;
export type StreakRewardType = (typeof STREAK_REWARD_TYPES)[number];

/** Una Recompensa, como la devuelve el back. `service` sigue con su nombre aunque el Servicio se haya dado de baja. */
export const streakRewardSchema = z.object({
    id: z.number(),
    requiredCount: z.number(),
    repeatable: z.boolean(),
    type: z.enum(STREAK_REWARD_TYPES),
    value: z.number().nullable(),
    description: z.string().nullable(),
    service: z.object({ id: z.number(), name: z.string() }).nullable(),
    validForDays: z.number().nullable(),
});
export type StreakReward = z.infer<typeof streakRewardSchema>;

/** Las Rachas de un Negocio o de los Servicios personales de un Usuario. `burnAfterDays` es nulo mientras nadie lo fijó. */
export const streakProgramSchema = z.object({
    active: z.boolean(),
    burnAfterDays: z.number().nullable(),
    rewards: z.array(streakRewardSchema),
});
export type StreakProgram = z.infer<typeof streakProgramSchema>;

/** De quién son las Rachas: de ese Negocio, o sin `businessId`, de los Servicios personales del Usuario de la Sesión. */
export const streakProgramScopeSchema = z.object({ businessId: z.number().int().positive().optional() });
export type StreakProgramScope = z.infer<typeof streakProgramScopeSchema>;

/** La forma exacta que espera PUT `streak-program`, más el alcance que va en la ruta. */
export const saveStreakProgramSchema = streakProgramScopeSchema.extend({
    active: z.boolean(),
    burnAfterDays: z.number().int().min(BURN_AFTER_DAYS_MIN).max(BURN_AFTER_DAYS_MAX),
});
export type SaveStreakProgram = z.infer<typeof saveStreakProgramSchema>;

const hasCents = (value: number) => Math.round(value * 100) / 100 === value;
const rewardValue = z.number().max(REWARD_VALUE_MAX).refine(hasCents);
const positiveInt = z.number().int().min(1).max(POSITIVE_INT_MAX);
const commonRewardFields = { requiredCount: positiveInt, repeatable: z.boolean(), validForDays: positiveInt.nullable() };

/** Una Recompensa con el único campo que pide su tipo: el back guarda nulos los de los otros tipos. */
export const streakRewardFieldsSchema = z.discriminatedUnion('type', [
    z.object({ ...commonRewardFields, type: z.literal('PERCENT_DISCOUNT'), value: rewardValue.min(1).max(100) }),
    z.object({ ...commonRewardFields, type: z.literal('AMOUNT_DISCOUNT'), value: rewardValue.positive() }),
    z.object({ ...commonRewardFields, type: z.literal('GIFT'), description: z.string().trim().min(1).max(GIFT_DESCRIPTION_MAX) }),
    z.object({ ...commonRewardFields, type: z.literal('FREE_SERVICE'), serviceId: z.number().int().positive() }),
]);
export type StreakRewardFields = z.infer<typeof streakRewardFieldsSchema>;

/** La forma exacta que espera POST `streak-rewards`, más el alcance que va en la ruta. */
export const createStreakRewardSchema = streakRewardFieldsSchema.and(streakProgramScopeSchema);
export type CreateStreakReward = z.infer<typeof createStreakRewardSchema>;

/**
 * La forma que el front manda a PATCH `/streak-rewards/:id`, más el id que va en la ruta: la Recompensa entera, porque
 * el diálogo edita todos sus campos.
 */
export const updateStreakRewardSchema = streakRewardFieldsSchema.and(z.object({ id: z.number().int().positive() }));
export type UpdateStreakReward = z.infer<typeof updateStreakRewardSchema>;
