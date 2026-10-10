import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { BranchImage } from '@/src/entities/models/branch-image';

export type IUploadBranchImageUseCase = ReturnType<typeof uploadBranchImageUseCase>;
// "Only the Dueño" and the five-image limit are enforced by the back (403, 422).
export const uploadBranchImageUseCase =
    (instrumentationService: IInstrumentationService, businessesRepository: IBusinessesRepository) =>
    (branchId: number, file: File): Promise<BranchImage> =>
        instrumentationService.startSpan({ name: 'uploadBranchImage Use Case', op: 'function' }, () =>
            businessesRepository.uploadBranchImage(branchId, file),
        );
