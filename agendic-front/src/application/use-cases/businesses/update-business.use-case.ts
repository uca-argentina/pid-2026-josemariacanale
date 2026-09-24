import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Business, UpdateBusiness } from '@/src/entities/models/business';

export type IUpdateBusinessUseCase = ReturnType<typeof updateBusinessUseCase>;
// "Only the Dueño" is enforced by the back (403); the front does not duplicate it.
export const updateBusinessUseCase =
    (instrumentationService: IInstrumentationService, businessesRepository: IBusinessesRepository) =>
    (input: UpdateBusiness): Promise<Business> =>
        instrumentationService.startSpan({ name: 'updateBusiness Use Case', op: 'function' }, () =>
            businessesRepository.updateBusiness(input),
        );
