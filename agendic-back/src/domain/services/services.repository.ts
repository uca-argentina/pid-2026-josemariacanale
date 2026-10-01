import { EmployeeService, Service } from './service';

export const SERVICES_REPOSITORY = Symbol('ServicesRepository');

export interface ServicesRepository {
  /** Throws ConflictError when the name (in any casing) or the slug is taken by another active Service of the same Branch. */
  create(
    data: Pick<
      Service,
      | 'branchId'
      | 'name'
      | 'description'
      | 'category'
      | 'durationMinutes'
      | 'price'
      | 'depositPercent'
      | 'requiresApproval'
      | 'slug'
      | 'hidden'
    > & { employees: Omit<EmployeeService, 'serviceId'>[] },
  ): Promise<Service>;
  findById(id: number): Promise<Service | null>;
  listActiveByBranch(branchId: number): Promise<Service[]>;
  /** The Service of that Branch with that slug among the ones not dados de baja, hidden or not. Null if there is none. */
  findActiveBySlug(branchId: number, slug: string): Promise<Service | null>;
  /** Leaves undefined fields unchanged. Throws ConflictError on a rename to a taken name or slug. */
  update(
    id: number,
    data: Partial<
      Pick<
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
      >
    >,
  ): Promise<Service>;
  /** Also unlinks its Employees, freeing their Availabilities, and cancels its future BOOKED Bookings, atomically. */
  retire(
    id: number,
    retiredAt: Date,
  ): Promise<{ service: Service; cancelledBookings: number }>;
  /** Throws ConflictError when the Employee is already in charge of the Service. */
  addEmployee(link: EmployeeService): Promise<Service>;
  /** Points the Employee's link to another of their Availabilities; touches no Booking. Throws NotFoundError when they don't attend it. */
  setEmployeeAvailability(link: EmployeeService): Promise<Service>;
  /** Also cancels that pair's future BOOKED Bookings, atomically. */
  removeEmployee(
    serviceId: number,
    employeeId: number,
    now: Date,
  ): Promise<{ service: Service; cancelledBookings: number }>;
  /** Services not dados de baja that this Employee is in charge of, verified or not. */
  listActiveByEmployee(employeeId: number): Promise<Service[]>;
  /** The (Employee, Service) link, with the Availability the Employee uses for it. Null if they don't attend it. */
  findEmployeeLink(
    serviceId: number,
    employeeId: number,
  ): Promise<EmployeeService | null>;
}
