import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export type IDeleteBranchImageUseCase = ReturnType<typeof deleteBranchImageUseCase>;
/**
 * Borra una imagen de la Sucursal.
 *
 * @throws {NotFoundError} la imagen no es de esa Sucursal
 * @throws {ApiRequestError} no es el Dueño
 */
export const deleteBranchImageUseCase =
    (instrumentationService: IInstrumentationService, businessesRepository: IBusinessesRepository) =>
    (branchId: number, imageId: number): Promise<void> =>
        instrumentationService.startSpan({ name: 'deleteBranchImage Use Case', op: 'function' }, () =>
            businessesRepository.deleteBranchImage(branchId, imageId),
        );
