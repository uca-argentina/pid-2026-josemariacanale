import type { IWaitlistRepository } from '@/src/application/repositories/waitlist.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { JoinWaitlist, WaitlistEntry } from '@/src/entities/models/waitlist';

export type IJoinWaitlistUseCase = ReturnType<typeof joinWaitlistUseCase>;

/**
 * Anota al Cliente en la Lista de espera de un Servicio para una fecha con todos sus Horarios reservables tomados.
 * Si el día ya no está lleno, o el código no sirve, lo decide el back.
 *
 * @throws {InvalidVerificationCodeError} el código no es válido para el email, o venció
 * @throws {NotFoundError} el Servicio no existe o está dado de baja
 * @throws {WaitlistDayNotFullError} el día tiene Horarios reservables
 * @throws {WaitlistDateInPastError} la fecha ya pasó
 */
export const joinWaitlistUseCase =
    (instrumentationService: IInstrumentationService, waitlistRepository: IWaitlistRepository) =>
    (input: JoinWaitlist): Promise<WaitlistEntry> =>
        instrumentationService.startSpan({ name: 'joinWaitlist Use Case', op: 'function' }, () => waitlistRepository.join(input));
