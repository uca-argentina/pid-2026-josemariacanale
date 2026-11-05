import { BusinessesRepository } from '../../domain/businesses/businesses.repository';
import { EmployeesRepository } from '../../domain/employees/employees.repository';
import { ForbiddenError, NotFoundError } from '../../domain/errors';
import { OwnedStreakReward } from '../../domain/streaks/streak-program';
import { StreakProgramsRepository } from '../../domain/streaks/streak-programs.repository';

/**
 * The Recompensa, if the Usuario owns its program. To anybody else it doesn't exist, so an id
 * says nothing about other programs; only an Empleado of its Negocio, who already knows it, gets the 403.
 *
 * @throws {NotFoundError} `Streak reward <id> not found`: it doesn't exist, was borrada or is somebody else's
 * @throws {ForbiddenError} `Only the Dueño of Business <id> can change its Rachas`
 */
export async function findOwnStreakReward(
  repositories: {
    streakPrograms: StreakProgramsRepository;
    businesses: BusinessesRepository;
    employees: EmployeesRepository;
  },
  id: number,
  userId: number,
): Promise<OwnedStreakReward> {
  const notFound = new NotFoundError(`Streak reward ${id} not found`);
  const reward = await repositories.streakPrograms.findRewardById(id);
  if (!reward || reward.deletedAt) throw notFound;
  const { owner } = reward;
  if (owner.kind === 'personal') {
    if (owner.userId !== userId) throw notFound;
    return reward;
  }
  const business = await repositories.businesses.findById(owner.businessId);
  if (!business) throw notFound;
  if (business.ownerId === userId) return reward;
  const jobs = await repositories.employees.listActiveByUser(userId);
  if (!jobs.some((job) => job.businessId === business.id)) throw notFound;
  throw new ForbiddenError(
    `Only the Dueño of Business ${business.id} can change its Rachas`,
  );
}
