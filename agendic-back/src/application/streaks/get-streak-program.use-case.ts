import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  NO_STREAK_PROGRAM,
  StreakProgram,
  StreakProgramOwner,
} from '../../domain/streaks/streak-program';
import {
  STREAK_PROGRAMS_REPOSITORY,
  StreakProgramsRepository,
} from '../../domain/streaks/streak-programs.repository';
import { assertStreakProgramOwner } from './assert-streak-program-owner';

/** Reads the Rachas configuration of a Negocio or of the Usuario's Servicios personales. */
@Injectable()
export class GetStreakProgramUseCase {
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
  ): Promise<StreakProgram> {
    await assertStreakProgramOwner(this.businesses, owner, userId);
    return (
      (await this.streakPrograms.findByOwnerIncludeRewards(owner)) ??
      NO_STREAK_PROGRAM
    );
  }
}
