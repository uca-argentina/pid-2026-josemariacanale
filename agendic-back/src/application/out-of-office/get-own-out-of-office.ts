import { NotFoundError } from '../../domain/errors';
import { OutOfOffice } from '../../domain/out-of-office/out-of-office';
import { OutOfOfficeRepository } from '../../domain/out-of-office/out-of-office.repository';

/** Loads a período of the Usuario; one of someone else's looks like one that doesn't exist. */
export async function getOwnOutOfOffice(
  outOfOffice: OutOfOfficeRepository,
  id: number,
  userId: number,
): Promise<OutOfOffice> {
  const found = await outOfOffice.findById(id);
  if (!found || found.userId !== userId)
    throw new NotFoundError(`Out of office ${id} not found`);
  return found;
}
