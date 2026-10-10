import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { BranchImage } from '@/src/entities/models/branch-image';

export type IUploadBranchImageUseCase = ReturnType<typeof uploadBranchImageUseCase>;
/**
 * Sube una imagen a la Sucursal.
 *
 * El back valida que sea el Dueño y el tope de cinco; acá no se revalida.
 *
 * @throws {BranchImageLimitError} la Sucursal ya tiene cinco imágenes
 * @throws {ApiRequestError} no es el Dueño, el archivo pesa más de 5 MB o no es una imagen
 */
export const uploadBranchImageUseCase =
    (instrumentationService: IInstrumentationService, businessesRepository: IBusinessesRepository) =>
    (branchId: number, file: File): Promise<BranchImage> =>
        instrumentationService.startSpan({ name: 'uploadBranchImage Use Case', op: 'function' }, () =>
            businessesRepository.uploadBranchImage(branchId, file),
        );
