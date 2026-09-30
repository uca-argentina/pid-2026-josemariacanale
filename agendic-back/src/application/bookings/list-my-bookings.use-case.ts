import { Inject, Injectable } from '@nestjs/common';
import { EmployeeBooking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';

/** Lista los Turnos del Usuario como Empleado, en todos los Negocios donde sigue activo. */
@Injectable()
export class ListMyBookingsUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
  ) {}

  /**
   * Vacío si el Usuario no es Empleado activo de ningún Negocio.
   *
   * @throws {DatabaseOperationError} falló la base
   */
  async execute(userId: number): Promise<EmployeeBooking[]> {
    const employees = await this.employees.listActiveByUser(userId);
    if (employees.length === 0) return [];
    return this.bookings.listByEmployees(employees.map(({ id }) => id));
  }
}
