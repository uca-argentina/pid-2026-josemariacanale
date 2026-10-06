import { BranchesRepository } from '../../domain/branches/branches.repository';
import { BusinessesRepository } from '../../domain/businesses/businesses.repository';
import { ForbiddenError } from '../../domain/errors';
import { Service } from '../../domain/services/service';
import { assertBranchOwner } from '../branches/assert-branch-owner';

/**
 * Lets through whoever manages the Servicio: the Dueño of its Negocio, or its own Usuario in a Servicio personal.
 *
 * @throws {NotFoundError} the Service's Sucursal or Negocio doesn't exist
 * @throws {ForbiddenError} userId is not who manages it
 */
export async function assertServiceOwner(
  branches: BranchesRepository,
  businesses: BusinessesRepository,
  service: Service,
  userId: number,
): Promise<void> {
  if (service.branchId === null) {
    if (service.userId !== userId)
      throw new ForbiddenError('Not the owner of this Service');
    return;
  }
  await assertBranchOwner(branches, businesses, service.branchId, userId);
}
