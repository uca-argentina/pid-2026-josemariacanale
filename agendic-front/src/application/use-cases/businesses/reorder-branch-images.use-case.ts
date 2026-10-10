import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { BranchImage } from '@/src/entities/models/branch-image';

export type IReorderBranchImagesUseCase = ReturnType<typeof reorderBranchImagesUseCase>;
/**
 * Reordena las imágenes de la Sucursal; `imageIds` lleva todas, en el orden nuevo.
 *
 * @throws {NotFoundError} sobra alguna imagen que no es de la Sucursal
 * @throws {ApiRequestError} no es el Dueño o falta alguna imagen
 */
export const reorderBranchImagesUseCase =
    (instrumentationService: IInstrumentationService, businessesRepository: IBusinessesRepository) =>
    (branchId: number, imageIds: number[]): Promise<BranchImage[]> =>
        instrumentationService.startSpan({ name: 'reorderBranchImages Use Case', op: 'function' }, () =>
            businessesRepository.reorderBranchImages(branchId, imageIds),
        );
