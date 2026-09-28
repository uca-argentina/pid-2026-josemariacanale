import type { Branch } from '@/src/entities/models/branch';
import type { Business } from '@/src/entities/models/business';
import type { Service } from '@/src/entities/models/service';

// What the page of the Enlace de reserva reads from the back. Public: no Sesión involved.
export interface IPublicBusinessesRepository {
    // Throws NotFoundError (404) if no Negocio has that Enlace de reserva.
    getBusinessBySlug(slug: string): Promise<Business>;
    listBranches(businessId: number): Promise<Branch[]>;
    // Only the active Servicios of the Sucursal.
    listServices(branchId: number): Promise<Service[]>;
}
