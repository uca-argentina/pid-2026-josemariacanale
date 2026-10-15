import type { IWaitlistRepository } from '@/src/application/repositories/waitlist.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { WaitlistEntryView } from '@/src/entities/models/waitlist';

export type IGetWaitlistEntryByLinkUseCase = ReturnType<typeof getWaitlistEntryByLinkUseCase>;

/**
 * Abre la Anotación de un enlace de Salir de la Lista de espera, sin sacar a nadie de la lista: abrirlo no tiene
 * efectos, porque los antivirus del mail abren los enlaces solos.
 *
 * @throws {NotFoundError} el enlace no es de ninguna Anotación
 */
export const getWaitlistEntryByLinkUseCase =
    (instrumentationService: IInstrumentationService, waitlistRepository: IWaitlistRepository) =>
    (input: { link: string }): Promise<WaitlistEntryView> =>
        instrumentationService.startSpan({ name: 'getWaitlistEntryByLink Use Case', op: 'function' }, () =>
            waitlistRepository.getByLink(input.link),
        );
