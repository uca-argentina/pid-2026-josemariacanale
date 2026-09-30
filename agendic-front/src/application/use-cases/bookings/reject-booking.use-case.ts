import type { IEmployeeBookingsRepository } from '@/src/application/repositories/employee-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IRejectBookingUseCase = ReturnType<typeof rejectBookingUseCase>;

/**
 * Rechaza un Turno pendiente; su horario queda libre.
 *
 * Que el Turno sea del Empleado lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno no existe
 * @throws {BookingStateError} el Turno no está pendiente
 */
export const rejectBookingUseCase =
    (instrumentationService: IInstrumentationService, employeeBookingsRepository: IEmployeeBookingsRepository) =>
    (bookingId: number): Promise<void> =>
        instrumentationService.startSpan({ name: 'rejectBooking Use Case', op: 'function' }, () =>
            employeeBookingsRepository.reject(bookingId),
        );
