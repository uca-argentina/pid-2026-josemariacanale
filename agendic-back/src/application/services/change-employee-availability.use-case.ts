import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { BusinessRuleError, NotFoundError } from '../../domain/errors';
import { Service } from '../../domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { assertBranchExists } from '../branches/assert-branch-owner';
import { assertOwnerOrSelf } from '../employees/assert-owner-or-self';

/** Elige con cuál de sus Availability atiende un Empleado un Servicio (ADR 0017). */
@Injectable()
export class ChangeEmployeeAvailabilityUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
  ) {}

  /**
   * Lo hace el Dueño por cualquiera del Staff, o el propio Empleado. No cancela ni mueve Turnos.
   *
   * @throws {NotFoundError} el Servicio o la Availability no existen, o ese Empleado no atiende el Servicio
   * @throws {ForbiddenError} no es el Dueño ni ese Empleado
   * @throws {BusinessRuleError} la Availability es de otro Empleado
   */
  async execute(
    userId: number,
    serviceId: number,
    employeeId: number,
    availabilityId: number,
  ): Promise<Service> {
    const service = await this.services.findById(serviceId);
    if (!service) throw new NotFoundError('Service not found');
    const branch = await this.branches.findById(service.branchId);
    assertBranchExists(branch);
    await assertOwnerOrSelf(
      this.employees,
      this.businesses,
      branch.businessId,
      employeeId,
      userId,
    );
    if (!(await this.services.findEmployeeLink(serviceId, employeeId)))
      throw new NotFoundError('Employee not in charge of this Service');
    const availability = await this.availabilities.findById(availabilityId);
    if (!availability) throw new NotFoundError('Availability not found');
    if (availability.employeeId !== employeeId)
      throw new BusinessRuleError(
        'La Availability tiene que ser del mismo Empleado',
      );
    return this.services.setEmployeeAvailability({
      serviceId,
      employeeId,
      availabilityId,
    });
  }
}
