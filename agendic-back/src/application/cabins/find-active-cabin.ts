import { Cabin } from '../../domain/cabins/cabin';
import { CabinsRepository } from '../../domain/cabins/cabins.repository';
import { NotFoundError } from '../../domain/errors';

/** Throws NotFoundError for a Cabina that doesn't exist or was dada de baja. */
export async function findActiveCabin(
  cabins: CabinsRepository,
  id: number,
): Promise<Cabin> {
  const cabin = await cabins.findById(id);
  if (!cabin || cabin.deletedAt)
    throw new NotFoundError(`Cabin ${id} not found`);
  return cabin;
}
