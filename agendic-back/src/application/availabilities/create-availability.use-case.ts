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
import { assertEmployeeOwner } from '../employees/assert-employee-owner';

@Injectable()
export class CreateAvailabilityUseCase {
  constructor(
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  async execute(
    userId: number,
    employeeId: number,
    input: AvailabilityFields,
  ): Promise<Availability> {
    await assertEmployeeOwner(
      this.employees,
      this.businesses,
      employeeId,
      userId,
    );
    assertValidIntervals(input.intervals);
    // The Empleado's first one is born the default; the partial unique index catches two firsts racing.
    const isFirst = !(await this.availabilities.listByEmployee(employeeId))
      .length;
    return this.availabilities.create({
      employeeId,
      name: input.name,
      isDefault: isFirst,
      intervals: input.intervals,
    });
  }
}
