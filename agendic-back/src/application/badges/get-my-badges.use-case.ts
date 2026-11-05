import { Injectable } from '@nestjs/common';
import { BadgeStatus, describeBadges } from '../../domain/badges/badges';
import { EvaluateBadgesUseCase } from './evaluate-badges.use-case';

/** Las Insignias del Usuario de la Sesión con su Nivel y su progreso. */
@Injectable()
export class GetMyBadgesUseCase {
  constructor(private readonly evaluateBadges: EvaluateBadgesUseCase) {}

  /**
   * Evalúa al Usuario y responde una entrada por Insignia del catálogo, en su orden.
   *
   * @throws {DatabaseOperationError} una consulta o la escritura falló
   */
  async execute(userId: number): Promise<BadgeStatus[]> {
    const { metrics, earned } = (
      await this.evaluateBadges.execute([userId])
    ).get(userId)!;
    return describeBadges(metrics, earned);
  }
}
