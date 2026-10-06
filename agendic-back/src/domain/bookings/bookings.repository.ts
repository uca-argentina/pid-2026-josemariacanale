import { Booking, BookingStatus, EmployeeBooking } from './booking';

export const BOOKINGS_REPOSITORY = Symbol('BookingsRepository');

export interface CreateBookingData {
  serviceId: number;
  employeeId: number;
  clientName: string;
  clientEmail: string;
  prepStartsAt: Date;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
}

/** The Límite diario a verification must respect: at most `limit` PENDING or BOOKED Turnos of the Servicio starting in [from, to). */
export interface DailyLimitGuard {
  serviceId: number;
  limit: number;
  from: Date;
  to: Date;
}

export interface BookingsRepository {
  /** Generates the id and a single-use token valid until expiresAt; only the token's hash is stored. */
  create(
    data: CreateBookingData,
    expiresAt: Date,
  ): Promise<{ booking: Booking; token: string }>;
  /** When each of these Empleados last received a PENDING or BOOKED Turno of the Servicio (its `createdAt`); an Empleado with none is absent. Leaves out `excludeBookingId`. */
  lastReceivedByEmployee(
    serviceId: number,
    employeeIds: number[],
    excludeBookingId?: number,
  ): Promise<Map<number, Date>>;
  /** startsAt of the Servicio's PENDING and BOOKED Turnos, of every Empleado, starting in [from, to), leaving out `excludeBookingId`. */
  listOccupiedStartsByService(
    serviceId: number,
    from: Date,
    to: Date,
    excludeBookingId?: number,
  ): Promise<Date[]>;
  /** Throws BusinessRuleError for an unknown, used or expired token. */
  findByVerificationToken(token: string, now: Date): Promise<Booking>;
  /**
   * Moves an UNVERIFIED Booking to PENDING or BOOKED. With a `dailyLimit`, counts and verifies serialized per Servicio,
   * so two verifications racing can't both pass it. Throws ConflictError if it now overlaps a PENDING or BOOKED
   * Booking, or the Límite diario is reached.
   */
  markVerified(
    id: number,
    status: BookingStatus.PENDING | BookingStatus.BOOKED,
    dailyLimit?: DailyLimitGuard,
  ): Promise<Booking>;
  /** Throws NotFoundError for an unknown id. */
  findById(id: number): Promise<Booking>;
  /** Moves a PENDING Booking to BOOKED or REJECTED. Throws BusinessRuleError if it is no longer PENDING. */
  resolvePending(
    id: number,
    status: BookingStatus.BOOKED | BookingStatus.REJECTED,
  ): Promise<Booking>;
  listByBusiness(businessId: number): Promise<Booking[]>;
  /** PENDING and BOOKED Turnos of this Empleado, in any of their Servicios, whose [prepStartsAt, endsAt) overlaps [from, to), leaving out `excludeBookingId`. */
  listOccupiedByEmployee(
    employeeId: number,
    from: Date,
    to: Date,
    excludeBookingId?: number,
  ): Promise<Pick<Booking, 'prepStartsAt' | 'endsAt'>[]>;
  /** Every Turno, in any status, of these Empleados. */
  listByEmployees(employeeIds: number[]): Promise<EmployeeBooking[]>;
  /** Moves a BOOKED Booking to CANCELLED. Throws BusinessRuleError if it is no longer BOOKED. */
  cancel(id: number): Promise<Booking>;
  /** Moves a BOOKED Booking to the new times, with the given Empleado (the same or another). Throws BusinessRuleError if it is no longer BOOKED, ConflictError if it now overlaps another. */
  reschedule(
    id: number,
    times: Pick<Booking, 'employeeId' | 'prepStartsAt' | 'startsAt' | 'endsAt'>,
  ): Promise<Booking>;
  /** Sets noShowAt on a BOOKED Booking whose endsAt has passed and has none yet. Throws BusinessRuleError otherwise. */
  markNoShow(id: number, now: Date): Promise<Booking>;
}
