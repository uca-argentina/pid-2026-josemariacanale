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
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import {
  StreakReward,
  streakRewardTerms,
  StreakRewardTerms,
} from '../../domain/streaks/streak-program';
import {
  STREAK_PROGRAMS_REPOSITORY,
  StreakProgramsRepository,
} from '../../domain/streaks/streak-programs.repository';
import { assertFreeService } from './assert-free-service';
import { findOwnStreakReward } from './find-own-streak-reward';

/** Edits a Recompensa; the fields the patch leaves out stay as they were. */
@Injectable()
export class UpdateStreakRewardUseCase {
  constructor(
    @Inject(STREAK_PROGRAMS_REPOSITORY)
    private readonly streakPrograms: StreakProgramsRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
  ) {}

  /**
   * The free Servicio is only checked when the patch changes it: one dado de baja
   * after the fact doesn't block editing the rest of the Recompensa.
   *
   * @throws {NotFoundError} `Streak reward <id> not found`: it doesn't exist, was borrada or is somebody else's
   * @throws {ForbiddenError} the Usuario is an Empleado of its Negocio, not the Dueño
   * @throws {BadRequestError} the field of the resulting type is missing or out of range
   * @throws {BusinessRuleError} `Service <id> cannot be a free Service for this program`
   */
  async execute(
    userId: number,
    id: number,
    patch: Partial<StreakRewardTerms>,
  ): Promise<StreakReward> {
    const reward = await findOwnStreakReward(
      {
        streakPrograms: this.streakPrograms,
        businesses: this.businesses,
        employees: this.employees,
      },
      id,
      userId,
    );
    const terms = streakRewardTerms({
      requiredCount: reward.requiredCount,
      repeatable: reward.repeatable,
      type: reward.type,
      value: reward.value,
      description: reward.description,
      serviceId: reward.service?.id ?? null,
      validForDays: reward.validForDays,
      ...patch,
    });
    if (terms.serviceId !== null && terms.serviceId !== reward.service?.id)
      await assertFreeService(
        { services: this.services, branches: this.branches },
        reward.owner,
        terms.serviceId,
      );
    return this.streakPrograms.updateReward(id, terms);
  }
}
