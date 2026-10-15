import type { IUserBookingsRepository } from '@/src/application/repositories/user-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { BookingHistoryEntry } from '@/src/entities/models/booking-history';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IGetBookingHistoryUseCase = ReturnType<typeof getBookingHistoryUseCase>;

/**
 * El Historial del Turno, en orden: lo que le pasó desde que se Reservó, también lo de los Turnos que Reagendó.
 *
 * Que el Turno sea del Empleado lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno no existe
 */
export const getBookingHistoryUseCase =
    (instrumentationService: IInstrumentationService, userBookingsRepository: IUserBookingsRepository) =>
    (bookingId: number): Promise<BookingHistoryEntry[]> =>
        instrumentationService.startSpan({ name: 'getBookingHistory Use Case', op: 'function' }, () =>
            userBookingsRepository.getHistory(bookingId),
        );
