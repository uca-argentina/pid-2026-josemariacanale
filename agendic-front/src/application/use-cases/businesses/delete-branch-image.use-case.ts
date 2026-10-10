import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export type IDeleteBranchImageUseCase = ReturnType<typeof deleteBranchImageUseCase>;
// "Only the Dueño" is enforced by the back (403); the front does not duplicate it.
export const deleteBranchImageUseCase =
    (instrumentationService: IInstrumentationService, businessesRepository: IBusinessesRepository) =>
    (branchId: number, imageId: number): Promise<void> =>
        instrumentationService.startSpan({ name: 'deleteBranchImage Use Case', op: 'function' }, () =>
            businessesRepository.deleteBranchImage(branchId, imageId),
        );
