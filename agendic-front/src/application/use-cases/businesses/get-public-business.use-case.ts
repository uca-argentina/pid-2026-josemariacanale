import type { IPublicBusinessesRepository } from '@/src/application/repositories/public-businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Branch } from '@/src/entities/models/branch';
import type { Business } from '@/src/entities/models/business';

export type IGetPublicBusinessUseCase = ReturnType<typeof getPublicBusinessUseCase>;
// The Negocio of an Enlace de reserva without its Sucursal tramo, with every Sucursal to pick from.
export const getPublicBusinessUseCase =
    (instrumentationService: IInstrumentationService, publicBusinessesRepository: IPublicBusinessesRepository) =>
    (input: { businessSlug: string }): Promise<{ business: Business; branches: Branch[] }> =>
        instrumentationService.startSpan({ name: 'getPublicBusiness Use Case', op: 'function' }, async () => {
            const business = await publicBusinessesRepository.getBusinessBySlug(input.businessSlug);
            const branches = await publicBusinessesRepository.listBranches(business.id);
            return { business, branches };
        });
