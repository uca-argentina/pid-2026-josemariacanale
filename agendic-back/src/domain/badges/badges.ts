/** Nivel de una Insignia, de menor a mayor. Una Insignia de un solo Nivel usa `bronze`. */
export const BADGE_LEVELS = ['bronze', 'silver', 'gold', 'platinum'] as const;

/** Nivel de una Insignia. */
export type BadgeLevel = (typeof BADGE_LEVELS)[number];

/**
 * Lo que se mide de un Usuario para sus Insignias:
 * - `attended`: Turnos atendidos que atendió el Usuario (Servicios personales y de todo Negocio donde es o fue Empleado).
 * - `fiveStars`: Calificaciones de 5 en esos Turnos.
 * - `loyalClients`: emails de Cliente con 3 o más Turnos atendidos con el Usuario.
 * - `streak`: Turnos atendidos desde la última Ausencia del Anfitrión del Usuario.
 */
export type BadgeMetrics = {
  attended: number;
  fiveStars: number;
  loyalClients: number;
  streak: number;
};

/** Métricas de un Usuario sin trabajo registrado. */
export const NO_METRICS: BadgeMetrics = {
  attended: 0,
  fiveStars: 0,
  loyalClients: 0,
  streak: 0,
};

/** Una Insignia del catálogo: qué métrica la mide y la meta de cada Nivel, de menor a mayor. */
export type BadgeDefinition = {
  key: string;
  name: string;
  metric: keyof BadgeMetrics;
  levels: { level: BadgeLevel; target: number }[];
};

/** Catálogo de Insignias, en el orden en que se responden. Vive en código: la base solo guarda los Niveles ganados. */
export const BADGE_CATALOG: readonly BadgeDefinition[] = [
  {
    key: 'first-booking',
    name: 'Primer Turno',
    metric: 'attended',
    levels: [{ level: 'bronze', target: 1 }],
  },
  {
    key: 'attended',
    name: 'Turnos atendidos',
    metric: 'attended',
    levels: [
      { level: 'bronze', target: 10 },
      { level: 'silver', target: 50 },
      { level: 'gold', target: 100 },
      { level: 'platinum', target: 500 },
    ],
  },
  {
    key: 'five-stars',
    name: 'Cinco estrellas',
    metric: 'fiveStars',
    levels: [
      { level: 'bronze', target: 5 },
      { level: 'silver', target: 25 },
      { level: 'gold', target: 100 },
    ],
  },
  {
    key: 'loyal-clients',
    name: 'Clientes fieles',
    metric: 'loyalClients',
    levels: [{ level: 'bronze', target: 10 }],
  },
  {
    key: 'always-present',
    name: 'Siempre presente',
    metric: 'streak',
    levels: [{ level: 'bronze', target: 50 }],
  },
];

/** Un Nivel de una Insignia que el Usuario ya ganó. `seenAt` es `null` mientras no lo vio. */
export type EarnedLevel = {
  badge: string;
  level: BadgeLevel;
  earnedAt: Date;
  seenAt: Date | null;
};

/** Cada Nivel cuya meta alcanzan las métricas, en el orden del catálogo: todos los intermedios, no solo el más alto. */
export function levelsReached(
  metrics: BadgeMetrics,
): { badge: string; level: BadgeLevel }[] {
  return BADGE_CATALOG.flatMap((badge) =>
    badge.levels
      .filter(({ target }) => metrics[badge.metric] >= target)
      .map(({ level }) => ({ badge: badge.key, level })),
  );
}

/** Una Insignia del catálogo con el estado del Usuario, tal como la responde `GET /users/me/badges`. */
export type BadgeStatus = {
  badge: string;
  name: string;
  level: BadgeLevel | null;
  progress: { current: number; target: number } | null;
  levels: { level: BadgeLevel; target: number; earnedAt: string | null }[];
};

/**
 * Una entrada por Insignia del catálogo. `level` sale de lo ganado, no del conteo actual: un Nivel ganado no se
 * pierde si el conteo baja. `progress` apunta al primer Nivel sin ganar, con el conteo actual.
 */
export function describeBadges(
  metrics: BadgeMetrics,
  earned: readonly EarnedLevel[],
): BadgeStatus[] {
  return BADGE_CATALOG.map((badge) => {
    const earnedLevels = new Map(
      earned.filter((e) => e.badge === badge.key).map((e) => [e.level, e]),
    );
    const levels = badge.levels.map(({ level, target }) => ({
      level,
      target,
      earnedAt: earnedLevels.get(level)?.earnedAt.toISOString() ?? null,
    }));
    const next = levels.find((l) => l.earnedAt === null);
    return {
      badge: badge.key,
      name: badge.name,
      level: levels.filter((l) => l.earnedAt !== null).at(-1)?.level ?? null,
      progress: next
        ? { current: metrics[badge.metric], target: next.target }
        : null,
      levels,
    };
  });
}

/** Una Insignia con el Nivel más alto que ganó el Usuario, sin progreso: es lo que ven los demás. */
export type HighestLevel = { badge: string; name: string; level: BadgeLevel };

/**
 * El Nivel más alto ganado de cada Insignia, de mayor a menor Nivel y, a igual Nivel, en el orden del catálogo.
 * Ignora las Insignias que ya no están en el catálogo.
 */
export function highestLevels(earned: readonly EarnedLevel[]): HighestLevel[] {
  return BADGE_CATALOG.flatMap((badge) => {
    const highest = badge.levels
      .map((l) => l.level)
      .filter((level) =>
        earned.some((e) => e.badge === badge.key && e.level === level),
      )
      .at(-1);
    return highest
      ? [{ badge: badge.key, name: badge.name, level: highest }]
      : [];
  }).sort(
    (a, b) => BADGE_LEVELS.indexOf(b.level) - BADGE_LEVELS.indexOf(a.level),
  );
}
