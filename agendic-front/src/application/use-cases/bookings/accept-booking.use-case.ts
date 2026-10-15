import type { IUserBookingsRepository } from '@/src/application/repositories/user-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IAcceptBookingUseCase = ReturnType<typeof acceptBookingUseCase>;

/**
 * Acepta un Turno pendiente; con `series`, todos los pendientes por venir de su Serie.
 *
 * Que el Turno sea del Empleado lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno no existe
 * @throws {BookingStateError} el Turno no está pendiente, o con `series` no es de una Serie
 */
export const acceptBookingUseCase =
    (instrumentationService: IInstrumentationService, userBookingsRepository: IUserBookingsRepository) =>
    (bookingId: number, series?: boolean): Promise<void> =>
        instrumentationService.startSpan({ name: 'acceptBooking Use Case', op: 'function' }, () =>
            userBookingsRepository.accept(bookingId, series),
        );
