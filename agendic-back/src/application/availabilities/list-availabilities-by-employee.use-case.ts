import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import { Availability } from '../../domain/availabilities/availability';
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
export class ListAvailabilitiesByEmployeeUseCase {
  constructor(
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  async execute(userId: number, employeeId: number): Promise<Availability[]> {
    await assertEmployeeOwner(
      this.employees,
      this.businesses,
      employeeId,
      userId,
    );
    return this.availabilities.listByEmployee(employeeId);
  }
}
