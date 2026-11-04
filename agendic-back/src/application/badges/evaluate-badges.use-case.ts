import { Inject, Injectable } from '@nestjs/common';
import {
  BadgeMetrics,
  EarnedLevel,
  levelsReached,
  NO_METRICS,
} from '../../domain/badges/badges';
import {
  BADGES_REPOSITORY,
  BadgesRepository,
} from '../../domain/badges/badges.repository';
import { CLOCK, Clock } from '../../domain/clock';

/** Lo que se sabe de un Usuario tras evaluarlo: lo que mide hoy y todos los Niveles que ganó alguna vez. */
export type BadgeEvaluation = { metrics: BadgeMetrics; earned: EarnedLevel[] };

/** Evalúa las Insignias de un conjunto de Usuarios a la vez y guarda los Niveles recién alcanzados. */
@Injectable()
export class EvaluateBadgesUseCase {
  constructor(
    @Inject(BADGES_REPOSITORY) private readonly badges: BadgesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Mide a los Usuarios (una consulta por métrica, sin importar cuántos sean), guarda los Niveles alcanzados que
   * todavía no estaban y devuelve, por Usuario, sus métricas y todos sus Niveles ganados. Nunca borra un Nivel:
   * si el conteo bajó, el Nivel ganado se queda. Los Niveles se ganan con `earnedAt` = ahora, aunque se hayan
   * alcanzado varios de golpe.
   *
   * @throws {DatabaseOperationError} una consulta o la escritura falló
   */
  async execute(
    userIds: readonly number[],
  ): Promise<Map<number, BadgeEvaluation>> {
    const ids = [...new Set(userIds)];
    if (ids.length === 0) return new Map();
    const now = this.clock.now();
    const [metrics, earned] = await Promise.all([
      this.badges.measure(ids, now),
      this.badges.listEarned(ids),
    ]);

    const missing = ids.flatMap((userId) => {
      const have = new Set(
        (earned.get(userId) ?? []).map((e) => `${e.badge}/${e.level}`),
      );
      return levelsReached(metrics.get(userId) ?? NO_METRICS)
        .filter(({ badge, level }) => !have.has(`${badge}/${level}`))
        .map(({ badge, level }) => ({ userId, badge, level, earnedAt: now }));
    });

    // Si dos requests evalúan a la vez, el guardado ignora los duplicados; releer deja el `earnedAt` del ganador.
    const final =
      missing.length === 0
        ? earned
        : (await this.badges.saveEarned(missing),
          await this.badges.listEarned(ids));

    return new Map(
      ids.map((userId) => [
        userId,
        {
          metrics: metrics.get(userId) ?? NO_METRICS,
          earned: final.get(userId) ?? [],
        },
      ]),
    );
  }
}
