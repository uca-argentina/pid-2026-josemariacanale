import { LEVEL_NAMES } from '@/app/_components/medal-style';
import type { EmployeeBadge } from '@/src/entities/models/employee';

/** Cuántas medallas se ven en una fila de la tabla antes del "+N". */
export const MAX_VISIBLE_MEDALS = 3;

/** Parte las Insignias (ya de mayor a menor Nivel) en las medallas de la fila y las que quedan para el "+N". */
export function splitMedals(badges: EmployeeBadge[]) {
    return { visible: badges.slice(0, MAX_VISIBLE_MEDALS), rest: badges.slice(MAX_VISIBLE_MEDALS) };
}

/** El texto del tooltip de una medalla: la Insignia y su Nivel. */
export const medalTooltip = ({ name, level }: EmployeeBadge) => `${name} · ${LEVEL_NAMES[level]}`;
