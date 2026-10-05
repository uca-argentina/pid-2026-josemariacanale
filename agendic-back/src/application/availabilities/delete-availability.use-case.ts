import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import { BusinessRuleError } from '../../domain/errors';
import { getOwnAvailability } from './get-own-availability';

@Injectable()
export class DeleteAvailabilityUseCase {
  constructor(
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
  ) {}

  /**
   * @throws {NotFoundError} no existe o no es del Usuario
   * @throws {BusinessRuleError} es la predeterminada, o un Servicio se atiende con ella
   */
  async execute(userId: number, id: number): Promise<void> {
    const availability = await getOwnAvailability(this.availabilities, id, userId);
    // So the Usuario always keeps exactly one default.
    if (availability.isDefault)
      throw new BusinessRuleError(
        'No se puede borrar la Availability predeterminada',
      );
    // The front shows this message as is: it tells the Usuario how many Servicios to change first.
    const inUse = await this.availabilities.countServices(id);
    if (inUse > 0)
      throw new BusinessRuleError(
        `No se puede borrar la Availability: ${inUse === 1 ? 'la usa 1 Servicio' : `la usan ${inUse} Servicios`}`,
      );
    await this.availabilities.delete(id);
  }
}
