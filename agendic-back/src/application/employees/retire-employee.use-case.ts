import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { BusinessRuleError } from '../../domain/errors';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { isLastEmployee } from '../services/is-last-employee';
import { MAILER, Mailer } from '../../domain/mailer';
import { notifyClients } from '../bookings/notify-clients';
import { assertEmployeeOwner } from './assert-employee-owner';

/** Da de baja un Empleado y cancela sus Turnos futuros, avisando por mail al Cliente de cada uno. */
@Injectable()
export class RetireEmployeeUseCase {
  constructor(
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /**
   * @throws {NotFoundError} el Empleado no existe
   * @throws {ForbiddenError} el Usuario no es el Dueño del Negocio
   * @throws {BusinessRuleError} es el Dueño, o es el último Empleado de algún Servicio
   */
  async execute(
    userId: number,
    employeeId: number,
  ): Promise<{ cancelledBookings: number }> {
    const employee = await assertEmployeeOwner(
      this.employees,
      this.businesses,
      employeeId,
      userId,
    );
    // assertEmployeeOwner already proved userId owns this Business, so this catches the Dueño de-baja-ing themselves.
    if (employee.userId === userId)
      throw new BusinessRuleError(
        'El Dueño no puede darse de baja como Empleado',
      );
    const affected = await this.services.listActiveByEmployee(employeeId);
    if (affected.some((service) => isLastEmployee(service, employeeId)))
      throw new BusinessRuleError(
        "Cannot retire the Employee: they are a Service's last Employee",
      );
    const { cancelledBookings } = await this.employees.retire(
      employee.id,
      this.clock.now(),
    );
    await notifyClients(cancelledBookings, (email, link) =>
      this.mailer.sendBookingCancellation(email, link),
    );
    return { cancelledBookings: cancelledBookings.length };
  }
}
