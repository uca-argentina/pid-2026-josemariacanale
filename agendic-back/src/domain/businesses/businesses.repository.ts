import { BranchImage } from '../branch-images/branch-image';
import { Branch, CreateBranchInput } from '../branches/branch';
import { Employee } from '../employees/employee';
import { Service } from '../services/service';
import { Business } from './business';

export const BUSINESSES_REPOSITORY = Symbol('BusinessesRepository');

/** Everything a Negocio needs to take Turnos, written at once. */
export interface CreateBusinessData {
  business: Pick<Business, 'name' | 'description' | 'ownerId' | 'slug'>;
  branch: CreateBranchInput;
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
    | 'repeatEveryWeeks'
    | 'repeatMaxBookings'
  >;
  /** The Dueño, in charge of that first Servicio with their default Availability. */
  employee: Pick<Employee, 'userId'>;
  /** The first Sucursal's images, one per URL, each one's order being its position here. */
  branchImageUrls: string[];
}

/** De quién es una fila de `BookingSlug`: de un Negocio o de un Usuario, nunca de los dos (ADR 0026). */
export interface SlugOwner {
  businessId: number | null;
  userId: number | null;
}

export interface CreatedBusiness {
  business: Business;
  branch: Branch;
  /** `null` si el Negocio se creó sin Servicio. */
  service: Service | null;
  employee: Employee;
  /** The first Sucursal's images, ascending by order. */
  images: BranchImage[];
}

/** Un Negocio visto por un Empleado suyo, con las Sucursales donde trabaja. */
export interface EmployeeBusiness {
  business: Business;
  /** Las Sucursales donde trabaja el Usuario, sin orden: todas las del Negocio si es su Dueño. */
  branchIds: number[];
}

export interface BusinessesRepository {
  /** Generates every id. Atomic: a failure in any part creates nothing. */
  create(data: CreateBusinessData): Promise<CreatedBusiness>;
  findById(id: number): Promise<Business | null>;
  /** `slug` is matched as stored, so the caller normalizes case beforehand. */
  findBySlug(slug: string): Promise<Business | null>;
  /**
   * De quién es el slug en `BookingSlug`, aunque su Negocio o Usuario esté dado de baja (ADR 0024); null si está libre.
   * `slug` is matched as stored, so the caller normalizes case beforehand.
   */
  findBookingSlugOwner(slug: string): Promise<SlugOwner | null>;
  listByOwner(ownerId: number): Promise<Business[]>;
  /**
   * Los Negocios no dados de baja donde el Usuario es Empleado activo, sin orden. Para quien no es Dueño,
   * `branchIds` son las Sucursales de los Servicios que Ofrece, sin los dados de baja.
   */
  listByEmployeeUser(userId: number): Promise<EmployeeBusiness[]>;
  /** Leaves undefined fields unchanged. */
  update(
    id: number,
    data: Partial<Pick<Business, 'name' | 'description' | 'slug' | 'logoUrl'>>,
  ): Promise<Business>;
}
