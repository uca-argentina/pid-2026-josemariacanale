import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GrantStreakPrizesUseCase } from '../../application/streaks/grant-streak-prizes.use-case';

/** Cada 5 minutos da los Premios que les faltan a las Rachas en curso, como el job de la Lista de espera (ADR 0035). */
@Injectable()
export class StreakPrizesJob {
  constructor(private readonly grantStreakPrizes: GrantStreakPrizesUseCase) {}

  /**
   * Corre una pasada del caso de uso.
   *
   * @throws {DatabaseOperationError} falló la base al buscar los programas
   */
  @Cron('*/5 * * * *')
  run() {
    return this.grantStreakPrizes.execute();
  }
}
