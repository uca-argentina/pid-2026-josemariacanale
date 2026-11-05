import type { IUserBookingsRepository } from '@/src/application/repositories/user-bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { RedeemedPrize } from '@/src/entities/models/booking-streak';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IRedeemPrizeUseCase = ReturnType<typeof redeemPrizeUseCase>;

/**
 * Canjea un Premio de la Ficha del Cliente en un Turno aceptado: el Empleado lo entrega y queda asentado.
 *
 * Que el Turno sea del Empleado, y que el Premio sea de la misma Ficha, esté vigente y sin Canjear, lo valida el back.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno o el Premio no existen
 * @throws {PrizeAlreadyRedeemedError} el Premio ya se Canjeó
 * @throws {PrizeExpiredError} el Premio venció
 * @throws {PrizeOfAnotherClientError} el Premio es de otra Ficha del Cliente
 * @throws {BookingStateError} el Turno no está aceptado
 */
export const redeemPrizeUseCase =
    (instrumentationService: IInstrumentationService, userBookingsRepository: IUserBookingsRepository) =>
    (bookingId: number, prizeId: number): Promise<RedeemedPrize> =>
        instrumentationService.startSpan({ name: 'redeemPrize Use Case', op: 'function' }, () =>
            userBookingsRepository.redeemPrize(bookingId, prizeId),
        );
