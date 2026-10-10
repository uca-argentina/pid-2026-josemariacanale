import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export type IDeleteBusinessLogoUseCase = ReturnType<typeof deleteBusinessLogoUseCase>;
/**
 * Quita el Logo del Negocio; no falla si no tenía.
 *
 * @throws {ApiRequestError} no es el Dueño
 */
export const deleteBusinessLogoUseCase =
    (instrumentationService: IInstrumentationService, businessesRepository: IBusinessesRepository) =>
    (businessId: number): Promise<void> =>
        instrumentationService.startSpan({ name: 'deleteBusinessLogo Use Case', op: 'function' }, () =>
            businessesRepository.deleteBusinessLogo(businessId),
        );
