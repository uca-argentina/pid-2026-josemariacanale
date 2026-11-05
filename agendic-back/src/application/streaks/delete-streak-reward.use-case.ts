import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import {
  STREAK_PROGRAMS_REPOSITORY,
  StreakProgramsRepository,
} from '../../domain/streaks/streak-programs.repository';
import { findOwnStreakReward } from './find-own-streak-reward';

/** Borra a Recompensa; the row stays as history. */
@Injectable()
export class DeleteStreakRewardUseCase {
  constructor(
    @Inject(STREAK_PROGRAMS_REPOSITORY)
    private readonly streakPrograms: StreakProgramsRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
  ) {}

  /**
   * @throws {NotFoundError} `Streak reward <id> not found`: it doesn't exist, was borrada or is somebody else's
   * @throws {ForbiddenError} the Usuario is an Empleado of its Negocio, not the Dueño
   */
  async execute(userId: number, id: number): Promise<void> {
    await findOwnStreakReward(
      {
        streakPrograms: this.streakPrograms,
        businesses: this.businesses,
        employees: this.employees,
      },
      id,
      userId,
    );
    await this.streakPrograms.deleteReward(id);
  }
}
