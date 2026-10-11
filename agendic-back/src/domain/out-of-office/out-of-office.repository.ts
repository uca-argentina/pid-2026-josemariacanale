import { OutOfOffice, OutOfOfficeFields } from './out-of-office';

export const OUT_OF_OFFICE_REPOSITORY = Symbol('OutOfOfficeRepository');

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
  /** Throws ConflictError when another período of the Usuario has those dates. */
  update(id: number, data: OutOfOfficeFields): Promise<OutOfOffice>;
  delete(id: number): Promise<void>;
}
