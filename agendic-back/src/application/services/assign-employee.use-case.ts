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
import { defaultAvailability } from '../availabilities/default-availability';
import { assertServiceOwnerOrSelf } from './assert-service-owner-or-self';

export interface AssignEmployeeInput {
  employeeId: number;
  /** One of that Empleado's Usuario's own; without it, their default. */
  availabilityId?: number;
}

@Injectable()
export class AssignEmployeeUseCase {
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
   * Ofrecer: lo hace el Dueño por cualquiera del Staff, o el propio Empleado por sí mismo (ADR 0017).
   *
   * @throws {NotFoundError} el Servicio, su Sucursal, el Empleado o la Availability no existen, o el Servicio está oculto y quien
   * llama no es Dueño ni lo atiende
   * @throws {ForbiddenError} no es el Dueño ni ese Empleado
   * @throws {BusinessRuleError} el Servicio está dado de baja, el Empleado no es del Negocio o está dado de baja, o la
   * Availability es de otro Usuario
   * @throws {ConflictError} el Empleado ya lo atiende
   */
  async execute(
    userId: number,
    serviceId: number,
    { employeeId, availabilityId }: AssignEmployeeInput,
  ): Promise<Service> {
    const service = await this.services.findById(serviceId);
    if (!service) throw new NotFoundError('Service not found');
    // A Servicio dado de baja has no links: one here would keep its Availability from being deleted.
    if (service.deletedAt)
      throw new BusinessRuleError('The Service is retired');
    const { branch, isOwner } = await assertServiceOwnerOrSelf(
      this.branches,
      this.businesses,
      this.employees,
      service,
      employeeId,
      userId,
    );
    if (
      !isOwner &&
      service.hidden &&
      !service.employees.some(({ id }) => id === employeeId)
    )
      throw new NotFoundError('Service not found');
    const employee = await this.employees.findById(employeeId);
    if (!employee) throw new NotFoundError('Employee not found');
    if (
      employee.businessId !== branch.businessId ||
      employee.deletedAt !== null
    )
      throw new BusinessRuleError(
        'The Employee must belong to this Business and not be retired',
      );
    const availability =
      availabilityId === undefined
        ? await defaultAvailability(this.availabilities, employee.userId)
        : await this.availabilities.findById(availabilityId);
    if (!availability) throw new NotFoundError('Availability not found');
    if (availability.userId !== employee.userId)
      throw new BusinessRuleError(
        'La Availability tiene que ser del mismo Usuario que el Empleado',
      );
    return this.services.addEmployee({
      serviceId,
      employeeId,
      availabilityId: availability.id,
    });
  }
}
