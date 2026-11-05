import type { BadgeLevel } from '@/src/entities/models/badge';

/** El nombre de cada Nivel como lo lee el Usuario. */
export const LEVEL_NAMES: Record<BadgeLevel, string> = {
    bronze: 'Bronce',
    silver: 'Plata',
    gold: 'Oro',
    platinum: 'Platino',
};

/** El gradiente del círculo de la medalla en cada Nivel. */
export const LEVEL_GRADIENTS: Record<BadgeLevel, string> = {
    bronze: 'bg-gradient-to-br from-[#e0a46b] to-[#9a5b27]',
    silver: 'bg-gradient-to-br from-[#e5e7eb] to-[#8b95a5]',
    gold: 'bg-gradient-to-br from-[#fde68a] to-[#d4a017]',
    platinum: 'bg-gradient-to-br from-[#e0f2fe] to-[#7c8cf8]',
};

/** El gradiente de una medalla de una Insignia que todavía no ganó ningún Nivel. */
export const LOCKED_GRADIENT = 'bg-[#e5e7eb] opacity-60 grayscale';

/** El nombre accesible de la medalla: la Insignia y su Nivel, o que todavía no tiene ninguno. */
export function medalLabel(name: string, level: BadgeLevel | null) {
    return level ? `${name}, Nivel ${LEVEL_NAMES[level]}` : `${name}, sin Nivel ganado`;
}
