import type { Business, CreateBusiness } from '@/src/entities/models/business';

export interface IBusinessesRepository {
    // Throws SlugTakenError (409) or InvalidSlugError (400).
    createBusiness(input: CreateBusiness): Promise<Business>;
}
