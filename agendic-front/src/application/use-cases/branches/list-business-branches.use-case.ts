import type { IPublicBusinessesRepository } from '@/src/application/repositories/public-businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Branch } from '@/src/entities/models/branch';

export type IListBusinessBranchesUseCase = ReturnType<typeof listBusinessBranchesUseCase>;
/**
 * Lista las Sucursales del Negocio, sin sus Imágenes.
 *
 * @throws {ApiRequestError} el back falló
 */
export const listBusinessBranchesUseCase =
    (instrumentationService: IInstrumentationService, publicBusinessesRepository: IPublicBusinessesRepository) =>
    (businessId: number): Promise<Branch[]> =>
        instrumentationService.startSpan({ name: 'listBusinessBranches Use Case', op: 'function' }, () =>
            publicBusinessesRepository.listBranches(businessId),
        );
