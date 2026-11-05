import { z } from 'zod';
import { STREAK_REWARD_TYPES, streakRewardSchema } from './streak-program';

/** Un Premio disponible de la Ficha del Cliente, como lo devuelve `GET /bookings/:id/streak`. `serviceName` es la copia del nombre al ganarlo. */
export const prizeSchema = z.object({
    id: z.number(),
    type: z.enum(STREAK_REWARD_TYPES),
    value: z.number().nullable(),
    description: z.string().nullable(),
    serviceName: z.string().nullable(),
    grantedAt: z.iso.datetime(),
    expiresAt: z.iso.datetime().nullable(),
});
/** Un Premio, ya validado. */
export type Prize = z.infer<typeof prizeSchema>;

/** Un Premio recién Canjeado, como lo devuelve `PATCH /bookings/:id/redeem-prize`. */
export const redeemedPrizeSchema = prizeSchema.extend({ redeemedAt: z.iso.datetime() });
/** Un Premio Canjeado, ya validado. */
export type RedeemedPrize = z.infer<typeof redeemedPrizeSchema>;

/**
 * La Racha del Cliente de un Turno, como la devuelve `GET /bookings/:id/streak`. `streak` es nulo con el programa
 * apagado, sin Recompensas o sin Tiempo de quemada, pero `prizes` puede traer Premios igual. `burnsAt` es nulo si el
 * Cliente no tiene una Racha en curso.
 */
export const bookingStreakSchema = z.object({
    streak: z.object({ count: z.number(), burnsAt: z.iso.datetime().nullable() }).nullable(),
    nextReward: z.object({ reward: streakRewardSchema, remaining: z.number() }).nullable(),
    prizes: z.array(prizeSchema),
});
/** La Racha del Cliente de un Turno, ya validada. */
export type BookingStreak = z.infer<typeof bookingStreakSchema>;
