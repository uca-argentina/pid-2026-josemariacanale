import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export type IRequestVerificationCodeUseCase = ReturnType<typeof requestVerificationCodeUseCase>;

/**
 * Pide un Código de verificación para email, paso previo a Reservar (ADR 0022).
 *
 * @throws {TooManyVerificationCodeRequestsError} ya se pidieron demasiados para ese email
 */
export const requestVerificationCodeUseCase =
    (instrumentationService: IInstrumentationService, bookingsRepository: IBookingsRepository) =>
    (email: string): Promise<void> =>
        instrumentationService.startSpan({ name: 'requestVerificationCode Use Case', op: 'function' }, () =>
            bookingsRepository.requestVerificationCode(email),
        );
