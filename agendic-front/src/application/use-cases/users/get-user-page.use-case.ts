import type { IUsersRepository } from '@/src/application/repositories/users.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { PublicUserPage } from '@/src/entities/models/user';

export type IGetUserPageUseCase = ReturnType<typeof getUserPageUseCase>;
/**
 * Gets the page of a Usuario's Enlace de reserva, with the Servicio of its tramo when there is one.
 *
 * @throws {NotFoundError} no Usuario has that Enlace de reserva, or none of their active Servicios personales has that tramo
 * @throws {ApiRequestError} the back failed
 */
export const getUserPageUseCase =
    (instrumentationService: IInstrumentationService, usersRepository: IUsersRepository) =>
    (input: { userSlug: string; serviceSlug?: string }): Promise<PublicUserPage> =>
        instrumentationService.startSpan({ name: 'getUserPage Use Case', op: 'function' }, async () => {
            const [page, selectedService] = await Promise.all([
                usersRepository.getUserPage(input.userSlug),
                input.serviceSlug ? usersRepository.getPersonalService(input.userSlug, input.serviceSlug) : null,
            ]);
            return { ...page, selectedService };
        });
