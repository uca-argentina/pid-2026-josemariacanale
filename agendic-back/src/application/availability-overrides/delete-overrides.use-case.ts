import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITY_OVERRIDES_REPOSITORY,
  AvailabilityOverridesRepository,
} from '../../domain/availability-overrides/availability-overrides.repository';
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
export class DeleteOverridesUseCase {
  constructor(
    @Inject(AVAILABILITY_OVERRIDES_REPOSITORY)
    private readonly overrides: AvailabilityOverridesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  async execute(
    userId: number,
    employeeId: number,
    date: string,
  ): Promise<void> {
    await assertEmployeeOwner(
      this.employees,
      this.businesses,
      employeeId,
      userId,
    );
    await this.overrides.delete(employeeId, date);
  }
}
