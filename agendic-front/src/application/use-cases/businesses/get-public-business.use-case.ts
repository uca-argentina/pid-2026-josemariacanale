import type { IPublicBusinessRepository } from '@/src/application/repositories/public-business.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Branch } from '@/src/entities/models/branch';
import type { Business } from '@/src/entities/models/business';
import type { Service } from '@/src/entities/models/service';

export interface PublicBusinessResult {
    business: Business;
    branches: Branch[];
    services: Service[];
}

export type IGetPublicBusinessUseCase = ReturnType<typeof getPublicBusinessUseCase>;
export const getPublicBusinessUseCase =
    (instrumentationService: IInstrumentationService, publicBusinessRepository: IPublicBusinessRepository) =>
    (slug: string): Promise<PublicBusinessResult> =>
        instrumentationService.startSpan({ name: 'getPublicBusiness Use Case', op: 'function' }, async () => {
            const normalizedSlug = slug.trim().toLowerCase();
            const business = await publicBusinessRepository.getBusinessBySlug(normalizedSlug);
            const branches = await publicBusinessRepository.listBranches(business.id);
            const servicesArrays = await Promise.all(
                branches.map((branch) => publicBusinessRepository.listServices(branch.id)),
            );
            const services = servicesArrays.flat();

            return { business, branches, services };
        });
