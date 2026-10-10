import { Branch } from '../branches/branch';
import { Employee } from '../employees/employee';
import { Service } from '../services/service';
import { Business } from './business';

export const BUSINESSES_REPOSITORY = Symbol('BusinessesRepository');

/** Everything a Negocio needs to take Turnos, written at once. */
export interface CreateBusinessData {
  business: Pick<Business, 'name' | 'description' | 'ownerId' | 'slug'>;
  branch: Pick<Branch, 'name' | 'address' | 'timeZone' | 'slug'> &
    Partial<Pick<Branch, 'description'>>;
  /** Without it the Negocio is created with no Servicio. */
  service?: Pick<
    Service,
    | 'name'
    | 'description'
    | 'category'
    | 'durationMinutes'
    | 'price'
    | 'depositPercent'
    | 'requiresApproval'
    | 'slug'
    | 'hidden'
    | 'prepMinutes'
    | 'dailyLimit'
    | 'slotInterval'
    | 'minimumNoticeMinutes'
  >;
  /** The Dueño, in charge of that first Servicio with their default Availability. */
  employee: Pick<Employee, 'userId'>;
}

export interface CreatedBusiness {
  business: Business;
  branch: Branch;
  service: Service | null;
  employee: Employee;
}

export interface BusinessesRepository {
  /** Generates every id. Atomic: a failure in any part creates nothing. */
  create(data: CreateBusinessData): Promise<CreatedBusiness>;
  findById(id: number): Promise<Business | null>;
  /** `slug` is matched as stored, so the caller normalizes case beforehand. */
  findBySlug(slug: string): Promise<Business | null>;
  listByOwner(ownerId: number): Promise<Business[]>;
  /** Leaves undefined fields unchanged. */
  update(
    id: number,
    data: Partial<Pick<Business, 'name' | 'description' | 'slug'>>,
  ): Promise<Business>;
}
