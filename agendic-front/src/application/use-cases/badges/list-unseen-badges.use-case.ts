import type { IBadgesRepository } from '@/src/application/repositories/badges.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { UnseenBadge } from '@/src/entities/models/badge';

export type IListUnseenBadgesUseCase = ReturnType<typeof listUnseenBadgesUseCase>;
/**
 * Lista los Niveles que el Usuario de la Sesión ganó y todavía no vio, del más antiguo al más reciente.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {ApiRequestError} el back falló
 */
export const listUnseenBadgesUseCase =
    (instrumentationService: IInstrumentationService, badgesRepository: IBadgesRepository) =>
    (): Promise<UnseenBadge[]> =>
        instrumentationService.startSpan({ name: 'listUnseenBadges Use Case', op: 'function' }, () => badgesRepository.listUnseenBadges());
