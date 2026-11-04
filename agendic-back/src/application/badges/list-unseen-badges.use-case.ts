import { Injectable } from '@nestjs/common';
import { BADGE_CATALOG, BadgeLevel } from '../../domain/badges/badges';
import { EvaluateBadgesUseCase } from './evaluate-badges.use-case';

/** Un Nivel ganado que el Usuario todavía no vio. */
export type UnseenBadge = {
  badge: string;
  name: string;
  level: BadgeLevel;
  earnedAt: Date;
};

/** Los Niveles que el Usuario de la Sesión ganó y todavía no vio. */
@Injectable()
export class ListUnseenBadgesUseCase {
  constructor(private readonly evaluateBadges: EvaluateBadgesUseCase) {}

  /**
   * Evalúa al Usuario y responde los Niveles sin ver por `earnedAt`; los de un mismo instante, en el orden del
   * catálogo.
   *
   * @throws {DatabaseOperationError} una consulta o la escritura falló
   */
  async execute(userId: number): Promise<UnseenBadge[]> {
    const { earned } = (await this.evaluateBadges.execute([userId])).get(
      userId,
    )!;
    const names = new Map(BADGE_CATALOG.map((b) => [b.key, b.name]));
    const order = BADGE_CATALOG.flatMap((b) =>
      b.levels.map((l) => `${b.key}/${l.level}`),
    );
    return earned
      .filter((e) => e.seenAt === null && names.has(e.badge))
      .sort(
        (a, b) =>
          a.earnedAt.getTime() - b.earnedAt.getTime() ||
          order.indexOf(`${a.badge}/${a.level}`) -
            order.indexOf(`${b.badge}/${b.level}`),
      )
      .map((e) => ({
        badge: e.badge,
        name: names.get(e.badge)!,
        level: e.level,
        earnedAt: e.earnedAt,
      }));
  }
}
