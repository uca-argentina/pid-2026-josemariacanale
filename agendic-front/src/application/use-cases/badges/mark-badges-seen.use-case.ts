import type { IBadgesRepository } from '@/src/application/repositories/badges.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export type IMarkBadgesSeenUseCase = ReturnType<typeof markBadgesSeenUseCase>;
/**
 * Marca como vistos todos los Niveles sin ver del Usuario de la Sesión.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {ApiRequestError} el back falló
 */
export const markBadgesSeenUseCase =
    (instrumentationService: IInstrumentationService, badgesRepository: IBadgesRepository) =>
    (): Promise<void> =>
        instrumentationService.startSpan({ name: 'markBadgesSeen Use Case', op: 'function' }, () => badgesRepository.markBadgesSeen());
