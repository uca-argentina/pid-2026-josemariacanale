import { CabinsRepository } from '../../domain/cabins/cabins.repository';
import { BusinessRuleError } from '../../domain/errors';

/** Throws BusinessRuleError naming the first id that isn't an active Cabina of the Sucursal. */
export async function assertActiveCabins(
  cabins: CabinsRepository,
  branchId: number,
  cabinIds: number[],
): Promise<void> {
  const active = new Set(
    (await cabins.listActiveByBranch(branchId)).map(({ id }) => id),
  );
  const foreign = cabinIds.find((id) => !active.has(id));
  if (foreign !== undefined)
    throw new BusinessRuleError(
      `Cabin ${foreign} is not an active Cabin of Branch ${branchId}`,
    );
}
