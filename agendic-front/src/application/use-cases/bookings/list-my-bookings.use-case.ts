import type { IEmployeeBookingsRepository } from '@/src/application/repositories/employee-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { EmployeeBooking } from '@/src/entities/models/employee-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IListMyBookingsUseCase = ReturnType<typeof listMyBookingsUseCase>;

/**
 * Lista los Turnos del Empleado logueado.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 */
export const listMyBookingsUseCase =
    (instrumentationService: IInstrumentationService, employeeBookingsRepository: IEmployeeBookingsRepository) =>
    (): Promise<EmployeeBooking[]> =>
        instrumentationService.startSpan({ name: 'listMyBookings Use Case', op: 'function' }, () =>
            employeeBookingsRepository.listMyBookings(),
        );
