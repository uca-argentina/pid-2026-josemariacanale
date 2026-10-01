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
import { NotFoundError } from '../../domain/errors';
import { assertOwnerOrSelf } from '../employees/assert-owner-or-self';

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

  /**
   * Las lee el Dueño del Negocio del Empleado, o el propio Empleado (ADR 0017).
   *
   * @throws {NotFoundError} el Empleado no existe
   * @throws {ForbiddenError} no es el Dueño ni ese Empleado
   */
  async execute(userId: number, employeeId: number): Promise<Availability[]> {
    const employee = await this.employees.findById(employeeId);
    if (!employee) throw new NotFoundError('Employee not found');
    await assertOwnerOrSelf(
      this.employees,
      this.businesses,
      employee.businessId,
      employeeId,
      userId,
    );
    return this.availabilities.listByEmployee(employeeId);
  }
}
