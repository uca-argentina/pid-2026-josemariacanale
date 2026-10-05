import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import { Availability } from '../../domain/availabilities/availability';
import { getOwnAvailability } from './get-own-availability';

@Injectable()
export class GetAvailabilityUseCase {
  constructor(
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
  ) {}

  /** @throws {NotFoundError} no existe o no es del Usuario */
  execute(userId: number, id: number): Promise<Availability> {
    return getOwnAvailability(this.availabilities, id, userId);
  }
}
