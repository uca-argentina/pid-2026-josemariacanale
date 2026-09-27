import { Availability, AvailabilityFields } from './availability';

export const AVAILABILITIES_REPOSITORY = Symbol('AvailabilitiesRepository');

export interface AvailabilitiesRepository {
  listByEmployee(employeeId: number): Promise<Availability[]>;
  findById(id: number): Promise<Availability | null>;
  /** Throws ConflictError when isDefault and the Empleado already has a default. */
  create(data: Omit<Availability, 'id'>): Promise<Availability>;
  /** Leaves undefined fields unchanged; `intervals`, when given, replace the whole set, atomically. */
  update(id: number, data: Partial<AvailabilityFields>): Promise<Availability>;
  /** Unmarks the Empleado's current default and marks this one, atomically. */
  makeDefault(id: number): Promise<Availability>;
  /** How many Servicios use it. */
  countServices(id: number): Promise<number>;
  /** Its Franjas go with it. Throws ConflictError when a Servicio uses it. */
  delete(id: number): Promise<void>;
}
