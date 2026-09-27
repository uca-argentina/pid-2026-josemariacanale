import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { BusinessRuleError } from '../../domain/errors';
import { assertAvailabilityOwner } from './assert-availability-owner';

@Injectable()
export class DeleteAvailabilityUseCase {
  constructor(
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  async execute(userId: number, id: number): Promise<void> {
    const availability = await assertAvailabilityOwner(
      this.availabilities,
      this.employees,
      this.businesses,
      id,
      userId,
    );
    // So the Empleado always keeps exactly one default.
    if (availability.isDefault)
      throw new BusinessRuleError(
        'No se puede borrar la Availability predeterminada',
      );
    await this.availabilities.delete(id);
  }
}
