import type { IPublicBusinessesRepository } from '@/src/application/repositories/public-businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { NotFoundError } from '@/src/entities/errors/common';
import type { Branch } from '@/src/entities/models/branch';
import type { BranchImage } from '@/src/entities/models/branch-image';
import type { Business } from '@/src/entities/models/business';
import type { Service, ServiceEmployee } from '@/src/entities/models/service';

export interface PublicBranch {
    business: Business;
    branch: Branch;
    // Every Sucursal of the Negocio, this one included.
    branches: Branch[];
    services: Service[];
    // The Empleados who attend the Sucursal: there is no endpoint for them, they are whoever
    // attends one of its Servicios.
    employees: ServiceEmployee[];
    // In gallery order.
    images: BranchImage[];
}

export type IGetPublicBranchUseCase = ReturnType<typeof getPublicBranchUseCase>;
// The Sucursal a full Enlace de reserva points to. There is no combined endpoint: the Sucursal
// tramo is looked up among the Negocio's own Sucursales, so one of another Negocio is a 404 too.
export const getPublicBranchUseCase =
    (instrumentationService: IInstrumentationService, publicBusinessesRepository: IPublicBusinessesRepository) =>
    (input: { businessSlug: string; branchSlug: string }): Promise<PublicBranch> =>
        instrumentationService.startSpan({ name: 'getPublicBranch Use Case', op: 'function' }, async () => {
            const business = await publicBusinessesRepository.getBusinessBySlug(input.businessSlug);
            const branches = await publicBusinessesRepository.listBranches(business.id);
            const branch = branches.find((b) => b.slug === input.branchSlug);
            if (!branch) throw new NotFoundError(`Business '${business.slug}' has no branch '${input.branchSlug}'`);

            const [services, unsortedImages] = await Promise.all([
                publicBusinessesRepository.listServices(branch.id),
                publicBusinessesRepository.listBranchImages(branch.id),
            ]);
            // ADR 0007: `order` is ascending but may have gaps, so it sorts, never indexes.
            const images = [...unsortedImages].sort((a, b) => a.order - b.order);
            const employees = [...new Map(services.flatMap((s) => s.employees).map((e) => [e.id, e])).values()];
            return { business, branch, branches, services, employees, images };
        });
