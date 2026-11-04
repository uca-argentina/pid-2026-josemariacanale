import { z } from 'zod';

/** Los Niveles de una Insignia, del más bajo al más alto. Una Insignia de un solo Nivel usa `bronze`. */
export const BADGE_LEVELS = ['bronze', 'silver', 'gold', 'platinum'] as const;
/** Un Nivel de una Insignia: `bronze`, `silver`, `gold` o `platinum`. */
export const badgeLevelSchema = z.enum(BADGE_LEVELS);
/** Un Nivel de una Insignia. */
export type BadgeLevel = z.infer<typeof badgeLevelSchema>;

/**
 * Una Insignia del Usuario y cuánto avanzó (`GET /users/me/badges`, ADR 0007).
 *
 * `badge` es la clave del catálogo (`first-booking`, `attended`, …); sigue siendo un string libre para que una Insignia
 * nueva del back no rompa la pantalla. `level` es el Nivel más alto ganado, `progress` el avance hacia el próximo
 * (`null` si ya ganó el último) y `levels` todos los Niveles con la fecha en que se ganaron (`null` si no).
 */
export const myBadgeSchema = z.object({
    badge: z.string(),
    name: z.string(),
    level: badgeLevelSchema.nullable(),
    progress: z.object({ current: z.number(), target: z.number() }).nullable(),
    levels: z.array(z.object({ level: badgeLevelSchema, target: z.number(), earnedAt: z.iso.datetime({ offset: true }).nullable() })),
});
export type MyBadge = z.infer<typeof myBadgeSchema>;
