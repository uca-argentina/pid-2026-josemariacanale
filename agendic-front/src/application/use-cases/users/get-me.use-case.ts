import type { IUsersRepository } from '@/src/application/repositories/users.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Me } from '@/src/entities/models/user';

export type IGetMeUseCase = ReturnType<typeof getMeUseCase>;
/**
 * Gets the Usuario of the Sesión as the back knows them, with their Enlace de reserva.
 *
 * @throws {ApiRequestError} the back failed
 */
export const getMeUseCase =
    (instrumentationService: IInstrumentationService, usersRepository: IUsersRepository) =>
    (): Promise<Me> =>
        instrumentationService.startSpan({ name: 'getMe Use Case', op: 'function' }, () => usersRepository.getMe());
