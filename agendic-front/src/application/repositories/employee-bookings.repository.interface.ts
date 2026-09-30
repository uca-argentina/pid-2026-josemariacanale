import type { EmployeeBooking } from '@/src/entities/models/employee-booking';

/** Turnos del Empleado con Sesión. */
export interface IEmployeeBookingsRepository {
    /**
     * Los Turnos de todos los Negocios donde el Usuario es Empleado activo; vacía si no es Empleado.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     */
    listMyBookings(): Promise<EmployeeBooking[]>;
}
