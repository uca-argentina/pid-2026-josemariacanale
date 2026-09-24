import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Business, CreateBusiness } from '@/src/entities/models/business';

export type ICreateBusinessUseCase = ReturnType<typeof createBusinessUseCase>;
// Any authenticated Usuario may create a Negocio; the back derives the Dueño from the Sesión.
export const createBusinessUseCase =
    (instrumentationService: IInstrumentationService, businessesRepository: IBusinessesRepository) =>
    (input: CreateBusiness): Promise<Business> =>
        instrumentationService.startSpan({ name: 'createBusiness Use Case', op: 'function' }, () =>
            businessesRepository.createBusiness(input),
        );
