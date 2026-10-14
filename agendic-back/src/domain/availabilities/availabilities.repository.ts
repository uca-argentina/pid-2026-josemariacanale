import { CausedCancellationOrder } from '../bookings/booking';
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
  /**
   * As `replace`, and in the same transaction cancels the Turnos of `cancellations` (ADR 0034) that are still PENDING or
   * BOOKED and have not started by `now`: CANCELLED, `cancelledAt` = `now`, `cancelledBy` EMPLOYEE, with each one's Motivo
   * de cancelación and Causa. Returns the Availability and the ids it really cancelled. If either write fails, neither stays.
   */
  replaceCancelling(
    id: number,
    data: AvailabilityFields,
    cancellations: CausedCancellationOrder[],
    now: Date,
  ): Promise<{ availability: Availability; cancelledIds: number[] }>;
  /** Unmarks the Usuario's current default and marks this one, atomically. */
  makeDefault(id: number): Promise<Availability>;
  /** How many Servicios use it. */
  countServices(id: number): Promise<number>;
  /** Its Franjas and Anulaciones go with it. Throws ConflictError when a Servicio uses it. */
  delete(id: number): Promise<void>;
}
