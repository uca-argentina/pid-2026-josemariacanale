import type { IWaitlistRepository } from '@/src/application/repositories/waitlist.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export type ILeaveWaitlistUseCase = ReturnType<typeof leaveWaitlistUseCase>;

/**
 * Saca al Cliente de la Lista de espera (Salir de la Lista de espera). Salir de nuevo no es un error.
 *
 * @throws {NotFoundError} el enlace no es de ninguna Anotación
 */
export const leaveWaitlistUseCase =
    (instrumentationService: IInstrumentationService, waitlistRepository: IWaitlistRepository) =>
    (input: { link: string }): Promise<void> =>
        instrumentationService.startSpan({ name: 'leaveWaitlist Use Case', op: 'function' }, () => waitlistRepository.leave(input.link));
