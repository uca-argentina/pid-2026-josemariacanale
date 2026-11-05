import type { IBadgesRepository } from '@/src/application/repositories/badges.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { MyBadge } from '@/src/entities/models/badge';

export type IListMyBadgesUseCase = ReturnType<typeof listMyBadgesUseCase>;
/**
 * Lista las Insignias del Usuario de la Sesión, con su Nivel y su progreso.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {ApiRequestError} el back falló
 */
export const listMyBadgesUseCase =
    (instrumentationService: IInstrumentationService, badgesRepository: IBadgesRepository) =>
    (): Promise<MyBadge[]> =>
        instrumentationService.startSpan({ name: 'listMyBadges Use Case', op: 'function' }, () => badgesRepository.listMyBadges());
