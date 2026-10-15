import { CausedCancellationOrder } from '../bookings/booking';
import { OutOfOffice, OutOfOfficeFields } from './out-of-office';

export const OUT_OF_OFFICE_REPOSITORY = Symbol('OutOfOfficeRepository');

/** Puerto de los períodos Fuera de la oficina del Usuario. */
export interface OutOfOfficeRepository {
  /** Los del Usuario con `endDate` ≥ `from` (YYYY-MM-DD), por `startDate` ascendente. */
  listByUserEndingFrom(userId: number, from: string): Promise<OutOfOffice[]>;
  findById(id: number): Promise<OutOfOffice | null>;
  /** El período del Usuario con exactamente estas fechas, si hay. */
  findByUserAndDates(
    userId: number,
    startDate: string,
    endDate: string,
  ): Promise<OutOfOffice | null>;
  /** Throws ConflictError when the Usuario already has a período with those dates. */
  create(userId: number, data: OutOfOfficeFields): Promise<OutOfOffice>;
  /**
   * As `create`, and in the same transaction cancels the Turnos of `cancellations` (ADR 0034) that are still PENDING or
   * BOOKED and have not started by `now`: CANCELLED, `cancelledAt` = `now`, `cancelledBy` EMPLOYEE, with each one's Motivo
   * de cancelación and Causa. Returns the período and the ids it really cancelled. If either write fails, neither stays.
   *
   * @throws {ConflictError} el Usuario ya tiene un período con esas fechas
   */
  createCancelling(
    userId: number,
    data: OutOfOfficeFields,
    cancellations: CausedCancellationOrder[],
    now: Date,
  ): Promise<{ outOfOffice: OutOfOffice; cancelledIds: number[] }>;
  /** Throws ConflictError when another período of the Usuario has those dates. */
  update(id: number, data: OutOfOfficeFields): Promise<OutOfOffice>;
  delete(id: number): Promise<void>;
}
