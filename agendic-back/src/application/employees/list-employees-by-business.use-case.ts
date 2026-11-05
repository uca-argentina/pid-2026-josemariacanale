import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { Employee } from '../../domain/employees/employee';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { ForbiddenError } from '../../domain/errors';
import { assertBusinessExists } from '../businesses/assert-owner';

/** Lista el Staff de un Negocio, abierto a cualquier Empleado activo suyo (el Dueño incluido). */
@Injectable()
export class ListEmployeesByBusinessUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
  ) {}

  /**
   * @throws {NotFoundError} el Negocio no existe o está dado de baja
   * @throws {ForbiddenError} el Usuario no es Empleado activo del Negocio
   */
  async execute(userId: number, businessId: number): Promise<Employee[]> {
    assertBusinessExists(await this.businesses.findById(businessId));
    const staff = await this.employees.listActiveByBusiness(businessId);
    if (!staff.some((employee) => employee.userId === userId))
      throw new ForbiddenError(
        `Only Employees of Business ${businessId} can see its Staff`,
      );
    return staff;
  }
}
