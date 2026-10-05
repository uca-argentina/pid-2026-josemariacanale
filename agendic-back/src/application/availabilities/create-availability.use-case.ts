import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import {
  Availability,
  assertValidAvailability,
  emptySchedule,
} from '../../domain/availabilities/availability';

@Injectable()
export class CreateAvailabilityUseCase {
  constructor(
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
  ) {}

  /**
   * Crea una Availability vacía, que no es la predeterminada.
   *
   * @throws {BusinessRuleError} la zona no es IANA
   */
  execute(
    userId: number,
    input: Pick<Availability, 'name' | 'timeZone'>,
  ): Promise<Availability> {
    assertValidAvailability({ ...input, schedule: emptySchedule(), overrides: [] });
    return this.availabilities.create({ userId, ...input });
  }
}
