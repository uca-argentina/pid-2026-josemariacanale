import type { IPublicBusinessesRepository } from '@/src/application/repositories/public-businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Branch } from '@/src/entities/models/branch';
import type { BranchImage } from '@/src/entities/models/branch-image';

/** Una Sucursal con sus Imágenes. */
export interface BranchWithImages {
    branch: Branch;
    /** En el orden de la galería. */
    images: BranchImage[];
}

export type IListBranchesWithImagesUseCase = ReturnType<typeof listBranchesWithImagesUseCase>;
/**
 * Lista las Sucursales del Negocio, cada una con sus Imágenes en el orden de la galería. Reusa los GET
 * públicos: no hay un endpoint combinado.
 *
 * @throws {ApiRequestError} el back falló
 */
export const listBranchesWithImagesUseCase =
    (instrumentationService: IInstrumentationService, publicBusinessesRepository: IPublicBusinessesRepository) =>
    (businessId: number): Promise<BranchWithImages[]> =>
        instrumentationService.startSpan({ name: 'listBranchesWithImages Use Case', op: 'function' }, async () => {
            const branches = await publicBusinessesRepository.listBranches(businessId);
            return Promise.all(
                branches.map(async (branch) => {
                    const images = await publicBusinessesRepository.listBranchImages(branch.id);
                    // ADR 0007: `order` is ascending but may have gaps, so it sorts, never indexes.
                    return { branch, images: [...images].sort((a, b) => a.order - b.order) };
                }),
            );
        });
