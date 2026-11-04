import { LEVEL_NAMES } from '@/app/_components/medal-style';
import type { MyBadge } from '@/src/entities/models/badge';

/** Las Insignias con un Nivel por alcanzar. */
export const inProgress = (badges: MyBadge[]) => badges.filter((b) => b.progress !== null);

/** Las Insignias con al menos un Nivel ganado. */
export const achieved = (badges: MyBadge[]) => badges.filter((b) => b.level !== null);

/** "73/100 para Oro": el avance hacia el próximo Nivel sin ganar. `null` si ya ganó el último. */
export function progressText(badge: MyBadge) {
    if (!badge.progress) return null;
    const next = badge.levels.find((l) => l.earnedAt === null);
    const target = `${badge.progress.current}/${badge.progress.target}`;
    return next ? `${target} para ${LEVEL_NAMES[next.level]}` : target;
}

/** El avance hacia el próximo Nivel, de 0 a 100. */
export function progressPercent({ current, target }: { current: number; target: number }) {
    return target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
}

/**
 * El día en que la Insignia ganó su Nivel actual, `YYYY-MM-DD`. Es el día UTC de `earnedAt`: el server no conoce la
 * zona del Usuario.
 */
export function earnedDay(badge: MyBadge) {
    const earnedAt = badge.levels.find((l) => l.level === badge.level)?.earnedAt;
    return earnedAt ? earnedAt.slice(0, 10) : null;
}
