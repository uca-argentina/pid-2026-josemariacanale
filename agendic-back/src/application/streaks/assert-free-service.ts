import { BranchesRepository } from '../../domain/branches/branches.repository';
import { BusinessRuleError } from '../../domain/errors';
import { ServicesRepository } from '../../domain/services/services.repository';
import { StreakProgramOwner } from '../../domain/streaks/streak-program';

/**
 * Checks that a Servicio can be a program's free Servicio: active and of its owner.
 *
 * @throws {BusinessRuleError} `Service <id> cannot be a free Service for this program`
 */
export async function assertFreeService(
  repositories: {
    services: ServicesRepository;
    branches: BranchesRepository;
  },
  owner: StreakProgramOwner,
  serviceId: number,
): Promise<void> {
  const service = await repositories.services.findById(serviceId);
  const isOwners = async () => {
    if (!service || service.deletedAt) return false;
    if (owner.kind === 'personal') return service.userId === owner.userId;
    if (service.branchId === null) return false;
    const branch = await repositories.branches.findById(service.branchId);
    return branch?.businessId === owner.businessId;
  };
  if (!(await isOwners()))
    throw new BusinessRuleError(
      `Service ${serviceId} cannot be a free Service for this program`,
    );
}
