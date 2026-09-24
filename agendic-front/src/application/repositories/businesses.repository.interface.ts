import type { Business, CreateBusiness } from '@/src/entities/models/business';

export interface IBusinessesRepository {
    // The Negocios of the Dueño of the Sesión: 0 or 1 (ADR 0012).
    listBusinesses(): Promise<Business[]>;
    // Throws AlreadyOwnerError (409), SlugTakenError (409) or InvalidSlugError (400).
    createBusiness(input: CreateBusiness): Promise<Business>;
}
