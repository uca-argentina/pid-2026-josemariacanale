import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { BusinessRuleError, NotFoundError } from '../../domain/errors';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { MAILER, Mailer } from '../../domain/mailer';
import { notifyClients } from '../bookings/notify-clients';
import { assertServiceOwnerOrSelf } from './assert-service-owner-or-self';
import { isLastEmployee } from './is-last-employee';

@Injectable()
export class RemoveEmployeeUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /**
   * Dejar de ofrecer: lo hace el Dueño por cualquiera del Staff, o el propio Empleado por sí mismo (ADR 0017).
   * Avisa por mail al Cliente de cada Turno futuro que cancela.
   *
   * @throws {NotFoundError} el Servicio, su Sucursal o el Empleado no existen
   * @throws {ForbiddenError} no es el Dueño ni ese Empleado
   * @throws {BusinessRuleError} es el último Empleado del Servicio
   */
  async execute(
    userId: number,
    serviceId: number,
    employeeId: number,
  ): Promise<{ cancelledBookings: number }> {
    const service = await this.services.findById(serviceId);
    if (!service) throw new NotFoundError('Service not found');
    await assertServiceOwnerOrSelf(
      this.branches,
      this.businesses,
      this.employees,
      service,
      employeeId,
      userId,
    );
    const employee = await this.employees.findById(employeeId);
    if (!employee) throw new NotFoundError('Employee not found');
    if (isLastEmployee(service, employeeId))
      throw new BusinessRuleError(
        "Cannot remove the Service's last Employee",
      );
    const { cancelledBookings } = await this.services.removeEmployee(
      serviceId,
      employeeId,
      this.clock.now(),
    );
    await notifyClients(cancelledBookings, (email, link) =>
      this.mailer.sendBookingCancellation(email, link),
    );
    return { cancelledBookings: cancelledBookings.length };
  }
}
