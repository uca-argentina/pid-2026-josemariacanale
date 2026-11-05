import type { IUserBookingsRepository } from '@/src/application/repositories/user-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { BookingStreak } from '@/src/entities/models/booking-streak';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IGetBookingStreakUseCase = ReturnType<typeof getBookingStreakUseCase>;

/**
 * La Racha del Cliente del Turno, lo que le falta para la próxima Recompensa y sus Premios disponibles.
 *
 * Que el Turno sea del Empleado lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno no existe
 */
export const getBookingStreakUseCase =
    (instrumentationService: IInstrumentationService, userBookingsRepository: IUserBookingsRepository) =>
    (bookingId: number): Promise<BookingStreak> =>
        instrumentationService.startSpan({ name: 'getBookingStreak Use Case', op: 'function' }, () =>
            userBookingsRepository.getStreak(bookingId),
        );
