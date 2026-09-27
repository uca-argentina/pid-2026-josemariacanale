import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import {
  Availability,
  AvailabilityFields,
  assertValidIntervals,
} from '../../domain/availabilities/availability';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { assertAvailabilityOwner } from './assert-availability-owner';

@Injectable()
export class UpdateAvailabilityUseCase {
  constructor(
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  /** `intervals`, when given, replace the whole set of Franjas. */
  async execute(
    userId: number,
    id: number,
    input: Partial<AvailabilityFields>,
  ): Promise<Availability> {
    await assertAvailabilityOwner(
      this.availabilities,
      this.employees,
      this.businesses,
      id,
      userId,
    );
    if (input.intervals) assertValidIntervals(input.intervals);
    return this.availabilities.update(id, {
      name: input.name,
      intervals: input.intervals,
    });
  }
}
