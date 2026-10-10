import { CancelledBooking } from '../bookings/booking';
import { Employee } from './employee';

export const EMPLOYEES_REPOSITORY = Symbol('EmployeesRepository');

export interface CreateEmployeeData {
  userId: number;
  businessId: number;
}

export interface EmployeesRepository {
  /** Only the ids that exist, in no particular order. */
  listByIds(ids: number[]): Promise<Employee[]>;
  /** Throws ConflictError when the Usuario is already an active Empleado of the Negocio. */
  create(data: CreateEmployeeData): Promise<Employee>;
  findById(id: number): Promise<Employee | null>;
  /** The Usuario's Employees not dados de baja: one per Negocio they work at. */
  listActiveByUser(userId: number): Promise<Employee[]>;
  /** The Business's Employees not dados de baja. */
  listActiveByBusiness(businessId: number): Promise<Employee[]>;
  /** Dado de baja: sets deletedAt, takes the Employee off every Service, and cancels their future BOOKED Bookings, atomically. */
  retire(
    id: number,
    deletedAt: Date,
  ): Promise<{ employee: Employee; cancelledBookings: CancelledBooking[] }>;
}
