import type { Branch } from '@/src/entities/models/branch';
import type { Business } from '@/src/entities/models/business';
import type { Service } from '@/src/entities/models/service';

export interface IPublicBusinessRepository {
    // Throws NotFoundError (404) if no Negocio has that slug.
    getBusinessBySlug(slug: string): Promise<Business>;
    listBranches(businessId: number): Promise<Branch[]>;
    listServices(branchId: number): Promise<Service[]>;
}
