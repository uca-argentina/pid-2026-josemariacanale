import { BusinessesRepository } from '../../domain/businesses/businesses.repository';
import { ForbiddenError } from '../../domain/errors';
import { StreakProgramOwner } from '../../domain/streaks/streak-program';
import { assertBusinessExists } from '../businesses/assert-owner';

/**
 * Lets through only who decides a program's Rachas: the Dueño, also over any Empleado (ADR 0007).
 * In the personales the owner comes from the Sesión, so there's nothing to check.
 *
 * @throws {NotFoundError} the Negocio doesn't exist or was dado de baja
 * @throws {ForbiddenError} `Only the Dueño of Business <id> can change its Rachas`
 */
export async function assertStreakProgramOwner(
  businesses: BusinessesRepository,
  owner: StreakProgramOwner,
  userId: number,
): Promise<void> {
  if (owner.kind === 'personal') return;
  const business = await businesses.findById(owner.businessId);
  assertBusinessExists(business);
  if (business.ownerId !== userId)
    throw new ForbiddenError(
      `Only the Dueño of Business ${business.id} can change its Rachas`,
    );
}
