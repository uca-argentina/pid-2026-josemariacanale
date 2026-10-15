import type { IUserBookingsRepository } from '@/src/application/repositories/user-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type ICancelBookingUseCase = ReturnType<typeof cancelBookingUseCase>;

/**
 * Cancela un Turno aceptado; su horario queda libre. `reason` es el Motivo de cancelación, opcional.
 *
 * Que el Turno sea del Empleado lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno no existe
 * @throws {CancellationReasonTooLongError} el Motivo de cancelación es demasiado largo
 * @throws {BookingStateError} el Turno no está aceptado
 */
export const cancelBookingUseCase =
    (instrumentationService: IInstrumentationService, userBookingsRepository: IUserBookingsRepository) =>
    (bookingId: number, reason?: string): Promise<void> =>
        instrumentationService.startSpan({ name: 'cancelBooking Use Case', op: 'function' }, () =>
            userBookingsRepository.cancel(bookingId, reason),
        );
