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
  /** Its Franjas go with it. */
  delete(id: number): Promise<void>;
}
