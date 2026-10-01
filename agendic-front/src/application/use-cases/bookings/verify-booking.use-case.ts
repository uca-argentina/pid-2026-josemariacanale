import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Booking } from '@/src/entities/models/booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IVerifyBookingUseCase = ReturnType<typeof verifyBookingUseCase>;

/**
 * Verifica el email del Cliente de un Turno sin verificar.
 *
 * El estado en que queda el Turno lo decide el back.
 *
 * @throws {BookingStateError} el token no existe, ya se usó o venció
 * @throws {SlotTakenError} el horario se ocupó mientras tanto
 * @throws {NotFoundError} el Servicio se dio de baja
 */
export const verifyBookingUseCase =
    (instrumentationService: IInstrumentationService, bookingsRepository: IBookingsRepository) =>
    (token: string): Promise<Booking> =>
        instrumentationService.startSpan({ name: 'verifyBooking Use Case', op: 'function' }, () =>
            bookingsRepository.verifyBooking(token),
        );
