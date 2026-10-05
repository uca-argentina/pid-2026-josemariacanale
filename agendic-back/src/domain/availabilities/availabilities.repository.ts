import {
  Availability,
  AvailabilityFields,
  AvailabilitySummary,
} from './availability';

export const AVAILABILITIES_REPOSITORY = Symbol('AvailabilitiesRepository');

export interface AvailabilitiesRepository {
  /** Ordered by id. */
  listByUser(userId: number): Promise<AvailabilitySummary[]>;
  /** With its schedule and Anulaciones. */
  findById(id: number): Promise<Availability | null>;
  /** Born empty and not the default: the Usuario already has one. */
  create(
    data: Pick<Availability, 'userId' | 'name' | 'timeZone'>,
  ): Promise<Availability>;
  /** Replaces all its Franjas and Anulaciones, atomically. */
  replace(id: number, data: AvailabilityFields): Promise<Availability>;
  /** Unmarks the Usuario's current default and marks this one, atomically. */
  makeDefault(id: number): Promise<Availability>;
  /** How many Servicios use it. */
  countServices(id: number): Promise<number>;
  /** Its Franjas and Anulaciones go with it. Throws ConflictError when a Servicio uses it. */
  delete(id: number): Promise<void>;
}
