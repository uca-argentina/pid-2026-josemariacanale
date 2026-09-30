import type { IEmployeeBookingsRepository } from '@/src/application/repositories/employee-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IRescheduleBookingUseCase = ReturnType<typeof rescheduleBookingUseCase>;

/**
 * Reagenda un Turno aceptado a otro Horario reservable; el horario anterior queda libre.
 *
 * Que el Turno sea del Empleado y que el horario exista lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno no existe
 * @throws {SlotTakenError} el horario choca con otro Turno del Empleado
 * @throws {BookingStateError} el Turno no está aceptado
 */
export const rescheduleBookingUseCase =
    (instrumentationService: IInstrumentationService, employeeBookingsRepository: IEmployeeBookingsRepository) =>
    (input: { bookingId: number; startsAt: string }): Promise<void> =>
        instrumentationService.startSpan({ name: 'rescheduleBooking Use Case', op: 'function' }, () =>
            employeeBookingsRepository.reschedule(input.bookingId, input.startsAt),
        );
