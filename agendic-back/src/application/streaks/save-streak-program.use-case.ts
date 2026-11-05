import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  StreakProgram,
  StreakProgramOwner,
  StreakProgramSettings,
} from '../../domain/streaks/streak-program';
import {
  STREAK_PROGRAMS_REPOSITORY,
  StreakProgramsRepository,
} from '../../domain/streaks/streak-programs.repository';
import { assertStreakProgramOwner } from './assert-streak-program-owner';

/** Turns the Rachas on or off and fixes the Tiempo de quemada, creating the program if needed. */
@Injectable()
export class SaveStreakProgramUseCase {
  constructor(
    @Inject(STREAK_PROGRAMS_REPOSITORY)
    private readonly streakPrograms: StreakProgramsRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  /**
   * @throws {NotFoundError} the Negocio doesn't exist or was dado de baja
   * @throws {ForbiddenError} the Usuario isn't its Dueño
   */
  async execute(
    userId: number,
    owner: StreakProgramOwner,
    settings: StreakProgramSettings,
  ): Promise<StreakProgram> {
    await assertStreakProgramOwner(this.businesses, owner, userId);
    return this.streakPrograms.save(owner, settings);
  }
}
