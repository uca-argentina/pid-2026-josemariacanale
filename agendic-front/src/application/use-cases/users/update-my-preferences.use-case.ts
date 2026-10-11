import type { IUsersRepository } from '@/src/application/repositories/users.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Me, Preferences } from '@/src/entities/models/user';

export type IUpdateMyPreferencesUseCase = ReturnType<typeof updateMyPreferencesUseCase>;
/**
 * Saves the Usuario's preferences of hour format and first day of the week; only the given fields change.
 *
 * @throws {ApiRequestError} the back rejected them or failed
 */
export const updateMyPreferencesUseCase =
    (instrumentationService: IInstrumentationService, usersRepository: IUsersRepository) =>
    (input: Partial<Preferences>): Promise<Me> =>
        instrumentationService.startSpan({ name: 'updateMyPreferences Use Case', op: 'function' }, () =>
            usersRepository.updateMyPreferences(input),
        );
