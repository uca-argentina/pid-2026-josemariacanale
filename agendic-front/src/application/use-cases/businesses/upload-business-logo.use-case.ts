import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Business } from '@/src/entities/models/business';

export type IUploadBusinessLogoUseCase = ReturnType<typeof uploadBusinessLogoUseCase>;
/**
 * Sube el Logo del Negocio, y reemplaza el anterior si había.
 *
 * El back valida que sea el Dueño, el tipo y el tamaño; acá no se revalida.
 *
 * @throws {ApiRequestError} no es el Dueño, el archivo pesa más de 5 MB o no es una imagen
 */
export const uploadBusinessLogoUseCase =
    (instrumentationService: IInstrumentationService, businessesRepository: IBusinessesRepository) =>
    (businessId: number, file: File): Promise<Business> =>
        instrumentationService.startSpan({ name: 'uploadBusinessLogo Use Case', op: 'function' }, () =>
            businessesRepository.uploadBusinessLogo(businessId, file),
        );
