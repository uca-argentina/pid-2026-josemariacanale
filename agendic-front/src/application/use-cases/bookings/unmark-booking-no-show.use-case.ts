import type { IUserBookingsRepository } from '@/src/application/repositories/user-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IUnmarkBookingNoShowUseCase = ReturnType<typeof unmarkBookingNoShowUseCase>;

/**
 * Desmarca la Ausencia del Invitado de un Turno aceptado, en cualquier momento.
 *
 * Que el Turno sea del Empleado lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno no existe
 * @throws {BookingStateError} el Turno no está aceptado o no tiene Ausencia del Invitado
 */
export const unmarkBookingNoShowUseCase =
    (instrumentationService: IInstrumentationService, userBookingsRepository: IUserBookingsRepository) =>
    (bookingId: number): Promise<void> =>
        instrumentationService.startSpan({ name: 'unmarkBookingNoShow Use Case', op: 'function' }, () =>
            userBookingsRepository.unmarkNoShow(bookingId),
        );
