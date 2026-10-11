import { ConflictError } from '../../domain/errors';
import { OutOfOfficeFields } from '../../domain/out-of-office/out-of-office';
import { OutOfOfficeRepository } from '../../domain/out-of-office/out-of-office.repository';

/**
 * @param ownId el período que se edita, que no cuenta como duplicado de sí mismo
 * @throws {ConflictError} otro período del Usuario tiene las mismas fechas
 */
export async function assertNoDuplicateOutOfOffice(
  outOfOffice: OutOfOfficeRepository,
  userId: number,
  { startDate, endDate }: Pick<OutOfOfficeFields, 'startDate' | 'endDate'>,
  ownId?: number,
): Promise<void> {
  const same = await outOfOffice.findByUserAndDates(userId, startDate, endDate);
  if (same && same.id !== ownId)
    throw new ConflictError(
      'Ya hay un período Fuera de la oficina con esas fechas',
    );
}
