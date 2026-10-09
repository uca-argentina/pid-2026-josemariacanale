import type { IUsersRepository } from '@/src/application/repositories/users.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export type IRetireMeUseCase = ReturnType<typeof retireMeUseCase>;
/**
 * Da de baja al Usuario de la Sesión, con todo lo que arrastra (ADR 0024).
 *
 * @throws {AuthProviderDeletionError} el back no pudo borrarlo en el Proveedor de autenticación; se puede reintentar
 * @throws {ApiRequestError} el back falló
 */
export const retireMeUseCase =
    (instrumentationService: IInstrumentationService, usersRepository: IUsersRepository) =>
    (): Promise<void> =>
        instrumentationService.startSpan({ name: 'retireMe Use Case', op: 'function' }, () => usersRepository.retireMe());
