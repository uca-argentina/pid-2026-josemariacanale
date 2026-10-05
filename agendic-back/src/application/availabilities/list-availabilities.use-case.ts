import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import { AvailabilitySummary } from '../../domain/availabilities/availability';

@Injectable()
export class ListAvailabilitiesUseCase {
  constructor(
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
  ) {}

  /** Las Availability del propio Usuario. */
  execute(userId: number): Promise<AvailabilitySummary[]> {
    return this.availabilities.listByUser(userId);
  }
}
