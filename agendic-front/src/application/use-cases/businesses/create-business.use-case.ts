import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { CreateBusiness, CreatedBusiness } from '@/src/entities/models/business';

export type ICreateBusinessUseCase = ReturnType<typeof createBusinessUseCase>;
/**
 * Crea el Negocio con su primera Sucursal y las imágenes de esa Sucursal. Cualquier Usuario con Sesión puede; el back
 * toma al Dueño de la Sesión.
 *
 * @throws {AlreadyOwnerError} el Usuario ya es Dueño de un Negocio
 * @throws {SlugTakenError} el Enlace de reserva ya está en uso
 * @throws {InvalidSlugError} el Enlace de reserva no tiene un formato válido
 * @throws {BranchImagesRejectedError} el back rechazó alguna imagen de la Sucursal
 */
export const createBusinessUseCase =
    (instrumentationService: IInstrumentationService, businessesRepository: IBusinessesRepository) =>
    (input: CreateBusiness): Promise<CreatedBusiness> =>
        instrumentationService.startSpan({ name: 'createBusiness Use Case', op: 'function' }, () =>
            businessesRepository.createBusiness(input),
        );
