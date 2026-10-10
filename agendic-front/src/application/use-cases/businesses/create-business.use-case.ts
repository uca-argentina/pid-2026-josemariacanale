import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { CreateBusiness, CreatedBusiness } from '@/src/entities/models/business';

export type ICreateBusinessUseCase = ReturnType<typeof createBusinessUseCase>;
// Any authenticated Usuario may create a Negocio; the back derives the Dueño from the Sesión.
export const createBusinessUseCase =
    (instrumentationService: IInstrumentationService, businessesRepository: IBusinessesRepository) =>
    (input: CreateBusiness): Promise<CreatedBusiness> =>
        instrumentationService.startSpan({ name: 'createBusiness Use Case', op: 'function' }, () =>
            businessesRepository.createBusiness(input),
        );
