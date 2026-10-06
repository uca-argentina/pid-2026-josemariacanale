import type { IServicesRepository } from '@/src/application/repositories/services.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { CreatePersonalService, PersonalService } from '@/src/entities/models/service';

export type ICreatePersonalServiceUseCase = ReturnType<typeof createPersonalServiceUseCase>;
/**
 * Creates a Servicio personal of the Usuario. That the Availability is theirs is enforced by the back (404).
 *
 * @throws {ServiceSlugTakenError} the tramo is taken among the Usuario's Servicios personales
 * @throws {ServiceNameTakenError} the name is taken among the Usuario's Servicios personales
 * @throws {NotFoundError} the Availability is not the Usuario's
 * @throws {ApiRequestError} the back failed
 */
export const createPersonalServiceUseCase =
    (instrumentationService: IInstrumentationService, servicesRepository: IServicesRepository) =>
    (input: CreatePersonalService): Promise<PersonalService> =>
        instrumentationService.startSpan({ name: 'createPersonalService Use Case', op: 'function' }, () =>
            servicesRepository.createPersonalService(input),
        );
