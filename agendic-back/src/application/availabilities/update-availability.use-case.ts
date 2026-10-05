import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import {
  Availability,
  AvailabilityFields,
  assertValidAvailability,
} from '../../domain/availabilities/availability';
import { getOwnAvailability } from './get-own-availability';

@Injectable()
export class UpdateAvailabilityUseCase {
  constructor(
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
  ) {}

  /**
   * Reemplaza todas las Franjas y Anulaciones.
   *
   * @throws {NotFoundError} no existe o no es del Usuario
   * @throws {BusinessRuleError} la zona no es IANA, o un rango termina antes de empezar o se pisa con otro
   */
  async execute(
    userId: number,
    id: number,
    input: AvailabilityFields,
  ): Promise<Availability> {
    await getOwnAvailability(this.availabilities, id, userId);
    assertValidAvailability(input);
    return this.availabilities.replace(id, input);
  }
}
