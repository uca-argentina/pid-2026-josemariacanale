import type { IServicesRepository } from '@/src/application/repositories/services.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { PersonalService } from '@/src/entities/models/service';

export type IListPersonalServicesUseCase = ReturnType<typeof listPersonalServicesUseCase>;
/**
 * Lists the Usuario's Servicios personales, the hidden ones included.
 *
 * @throws {ApiRequestError} the back failed
 */
export const listPersonalServicesUseCase =
    (instrumentationService: IInstrumentationService, servicesRepository: IServicesRepository) =>
    (): Promise<PersonalService[]> =>
        instrumentationService.startSpan({ name: 'listPersonalServices Use Case', op: 'function' }, () =>
            servicesRepository.listPersonalServices(),
        );
