import type { IUsersRepository } from '@/src/application/repositories/users.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Me } from '@/src/entities/models/user';

export type IUpdateMySlugUseCase = ReturnType<typeof updateMySlugUseCase>;
/**
 * Changes the Usuario's Enlace de reserva; the previous one stops working.
 *
 * @throws {SlugTakenError} another Usuario already uses it
 * @throws {InvalidSlugError} it does not have a valid format
 * @throws {ApiRequestError} the back failed
 */
export const updateMySlugUseCase =
    (instrumentationService: IInstrumentationService, usersRepository: IUsersRepository) =>
    (input: { slug: string }): Promise<Me> =>
        instrumentationService.startSpan({ name: 'updateMySlug Use Case', op: 'function' }, () =>
            usersRepository.updateMySlug(input.slug),
        );
