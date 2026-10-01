import type { Branch } from '@/src/entities/models/branch';
import type { BranchImage } from '@/src/entities/models/branch-image';
import type { Business } from '@/src/entities/models/business';
import type { Service } from '@/src/entities/models/service';

// What the page of the Enlace de reserva reads from the back. Public: no Sesión involved.
export interface IPublicBusinessesRepository {
    // Throws NotFoundError (404) if no Negocio has that Enlace de reserva.
    getBusinessBySlug(slug: string): Promise<Business>;
    listBranches(businessId: number): Promise<Branch[]>;
    // Only the active Servicios of the Sucursal, without the hidden ones.
    listServices(branchId: number): Promise<Service[]>;
    // The Servicio of the Sucursal with that tramo of the Enlace de reserva, even if hidden (ADR 0018).
    // Throws NotFoundError (404) if none of its Servicios not dados de baja has it.
    getServiceBySlug(branchId: number, slug: string): Promise<Service>;
    // Already in gallery order; empty when the Sucursal has no Imágenes yet.
    listBranchImages(branchId: number): Promise<BranchImage[]>;
}
