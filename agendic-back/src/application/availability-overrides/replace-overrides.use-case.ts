import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITY_OVERRIDES_REPOSITORY,
  AvailabilityOverridesRepository,
} from '../../domain/availability-overrides/availability-overrides.repository';
import {
  AvailabilityOverride,
  AvailabilityOverrideInterval,
  assertValidOverrideIntervals,
} from '../../domain/availability-overrides/availability-override';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { Employee } from '../../domain/employees/employee';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { BusinessRuleError } from '../../domain/errors';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { assertEmployeeOwner } from '../employees/assert-employee-owner';

export interface ReplaceOverridesInput {
  intervals: AvailabilityOverrideInterval[];
  coveredByEmployeeId: number | null;
}

@Injectable()
export class ReplaceOverridesUseCase {
  constructor(
    @Inject(AVAILABILITY_OVERRIDES_REPOSITORY)
    private readonly overrides: AvailabilityOverridesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
  ) {}

  async execute(
    userId: number,
    employeeId: number,
    date: string,
    input: ReplaceOverridesInput,
  ): Promise<AvailabilityOverride> {
    const employee = await assertEmployeeOwner(
      this.employees,
      this.businesses,
      employeeId,
      userId,
    );
    assertValidOverrideIntervals(input.intervals);
    if (input.coveredByEmployeeId != null)
      await this.assertCanCover(employee, input.coveredByEmployeeId);
    return this.overrides.replace(
      employeeId,
      date,
      input.intervals,
      input.coveredByEmployeeId,
    );
  }

  private async assertCanCover(
    employee: Employee,
    coveredByEmployeeId: number,
  ): Promise<void> {
    const covering = await this.employees.findById(coveredByEmployeeId);
    if (
      !covering ||
      covering.retiredAt ||
      covering.businessId !== employee.businessId
    )
      throw new BusinessRuleError(
        'La Cobertura tiene que ser un Empleado activo del mismo Negocio',
      );
    const [absentServices, coveringServices] = await Promise.all([
      this.services.listActiveByEmployee(employee.id),
      this.services.listActiveByEmployee(coveredByEmployeeId),
    ]);
    const coveringServiceIds = new Set(coveringServices.map((s) => s.id));
    if (absentServices.some((service) => !coveringServiceIds.has(service.id)))
      throw new BusinessRuleError(
        'La Cobertura tiene que atender todos los Servicios de quien se ausenta',
      );
  }
}
