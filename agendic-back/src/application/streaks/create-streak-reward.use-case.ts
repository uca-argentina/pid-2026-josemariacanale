import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import {
  StreakProgramOwner,
  StreakReward,
  streakRewardTerms,
  StreakRewardTerms,
} from '../../domain/streaks/streak-program';
import {
  STREAK_PROGRAMS_REPOSITORY,
  StreakProgramsRepository,
} from '../../domain/streaks/streak-programs.repository';
import { assertFreeService } from './assert-free-service';
import { assertStreakProgramOwner } from './assert-streak-program-owner';

/** Adds a Recompensa to a program, creating it off if there is none. */
@Injectable()
export class CreateStreakRewardUseCase {
  constructor(
    @Inject(STREAK_PROGRAMS_REPOSITORY)
    private readonly streakPrograms: StreakProgramsRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
  ) {}

  /**
   * @throws {NotFoundError} the Negocio doesn't exist or was dado de baja
   * @throws {ForbiddenError} the Usuario isn't its Dueño
   * @throws {BadRequestError} the field of the type is missing or out of range
   * @throws {BusinessRuleError} `Service <id> cannot be a free Service for this program`
   */
  async execute(
    userId: number,
    owner: StreakProgramOwner,
    draft: StreakRewardTerms,
  ): Promise<StreakReward> {
    await assertStreakProgramOwner(this.businesses, owner, userId);
    const terms = streakRewardTerms(draft);
    if (terms.serviceId !== null)
      await assertFreeService(
        { services: this.services, branches: this.branches },
        owner,
        terms.serviceId,
      );
    return this.streakPrograms.createReward(owner, terms);
  }
}
