import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { BranchImage } from '@/src/entities/models/branch-image';

export type IReorderBranchImagesUseCase = ReturnType<typeof reorderBranchImagesUseCase>;
// "Only the Dueño" and "every image included" are enforced by the back (403, 422, 404).
export const reorderBranchImagesUseCase =
    (instrumentationService: IInstrumentationService, businessesRepository: IBusinessesRepository) =>
    (branchId: number, imageIds: number[]): Promise<BranchImage[]> =>
        instrumentationService.startSpan({ name: 'reorderBranchImages Use Case', op: 'function' }, () =>
            businessesRepository.reorderBranchImages(branchId, imageIds),
        );
