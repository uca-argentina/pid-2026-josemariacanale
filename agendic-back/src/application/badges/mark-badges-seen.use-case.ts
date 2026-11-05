import { Inject, Injectable } from '@nestjs/common';
import {
  BADGES_REPOSITORY,
  BadgesRepository,
} from '../../domain/badges/badges.repository';
import { CLOCK, Clock } from '../../domain/clock';

/** Marca como vistos los Niveles ganados del Usuario de la Sesión. */
@Injectable()
export class MarkBadgesSeenUseCase {
  constructor(
    @Inject(BADGES_REPOSITORY) private readonly badges: BadgesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Marca todos los Niveles sin ver del Usuario. No evalúa: un Nivel que todavía no se guardó queda sin ver.
   *
   * @throws {DatabaseOperationError} la escritura falló
   */
  async execute(userId: number): Promise<void> {
    await this.badges.markSeen(userId, this.clock.now());
  }
}
