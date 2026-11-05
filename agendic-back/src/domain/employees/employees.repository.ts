import { ClientNotice } from '../bookings/booking';
import { Employee } from './employee';

export const EMPLOYEES_REPOSITORY = Symbol('EmployeesRepository');

export interface CreateEmployeeData {
  userId: number;
  businessId: number;
  /** Sucursales of that same Negocio where they start working. */
  branchIds: number[];
}

/** A Turno that taking an Empleado off a Sucursal cancels, with what the vista previa and the Aviso de cambio del Turno need. */
export interface BranchChangeBooking {
  id: number;
  startsAt: Date;
  endsAt: Date;
  /** The zone of the Sucursal, which is also the one the Cliente sees the Turno in. */
  timeZone: string;
  serviceName: string;
  clientName: string;
  clientEmail: string;
  /** Enlace del Turno; null only in a Turno Reagendar replaced, which is never upcoming. */
  link: string | null;
  seriesId: string | null;
  branch: { id: number; name: string };
}

export interface EmployeesRepository {
  /** Only the ids that exist, in no particular order. */
  listByIds(ids: number[]): Promise<Employee[]>;
  /** Throws ConflictError when the Usuario is already an active Empleado of the Negocio. Creates their Sucursales with them, atomically. */
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
  ): Promise<{ employee: Employee; cancelledBookings: ClientNotice[] }>;
  /**
   * PENDING and BOOKED Turnos of the Empleado that have not started by `now`, in Servicios of any of `branchIds`, by
   * `startsAt` and then id.
   */
  listUpcomingInBranches(
    employeeId: number,
    branchIds: number[],
    now: Date,
  ): Promise<BranchChangeBooking[]>;
  /**
   * Sets the Empleado's Sucursales to `branchIds`, atomically: takes them off every Servicio of the Sucursales they lose,
   * and cancels the Turnos of `cancelBookingIds` that are still PENDING or BOOKED and have not started by `now`
   * (CANCELLED, `cancelledAt` = `now`, `cancelledBy` EMPLOYEE, no Motivo de cancelación). Returns the Empleado and the ids
   * it really cancelled. If any write fails, none stays.
   *
   * @throws {NotFoundError} the Empleado does not exist
   */
  changeBranches(
    id: number,
    branchIds: number[],
    cancelBookingIds: number[],
    now: Date,
  ): Promise<{ employee: Employee; cancelledIds: number[] }>;
}
