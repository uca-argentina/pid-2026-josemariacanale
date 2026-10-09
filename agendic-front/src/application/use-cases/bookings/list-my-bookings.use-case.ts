import type { IUserBookingsRepository } from '@/src/application/repositories/user-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { UserBooking } from '@/src/entities/models/user-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IListMyBookingsUseCase = ReturnType<typeof listMyBookingsUseCase>;

/**
 * Lista los Turnos que atiende el Usuario logueado.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 */
export const listMyBookingsUseCase =
    (instrumentationService: IInstrumentationService, userBookingsRepository: IUserBookingsRepository) =>
    (): Promise<UserBooking[]> =>
        instrumentationService.startSpan({ name: 'listMyBookings Use Case', op: 'function' }, () =>
            userBookingsRepository.listMyBookings(),
        );
