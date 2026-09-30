import { Booking, BookingStatus } from './booking';

export const BOOKINGS_REPOSITORY = Symbol('BookingsRepository');

export interface CreateBookingData {
  serviceId: number;
  employeeId: number;
  clientName: string;
  clientEmail: string;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
}

export interface BookingsRepository {
  /** Generates the id and a single-use token valid until expiresAt; only the token's hash is stored. */
  create(
    data: CreateBookingData,
    expiresAt: Date,
  ): Promise<{ booking: Booking; token: string }>;
  /** Whether a PENDING or BOOKED Booking of the same Empleado overlaps [startsAt, endsAt). */
  hasOverlappingOccupied(
    employeeId: number,
    startsAt: Date,
    endsAt: Date,
  ): Promise<boolean>;
  /** Throws BusinessRuleError for an unknown, used or expired token. */
  findByVerificationToken(token: string, now: Date): Promise<Booking>;
  /** Moves an UNVERIFIED Booking to PENDING or BOOKED. Throws ConflictError if it now overlaps a PENDING or BOOKED Booking. */
  markVerified(
    id: number,
    status: BookingStatus.PENDING | BookingStatus.BOOKED,
  ): Promise<Booking>;
  /** Throws NotFoundError for an unknown id. */
  findById(id: number): Promise<Booking>;
  /** Moves a PENDING Booking to BOOKED or REJECTED. Throws BusinessRuleError if it is no longer PENDING. */
  resolvePending(
    id: number,
    status: BookingStatus.BOOKED | BookingStatus.REJECTED,
  ): Promise<Booking>;
  listByBusiness(businessId: number): Promise<Booking[]>;
  /** PENDING and BOOKED Turnos of this Empleado, in any of their Servicios, overlapping [from, to). */
  listOccupiedByEmployee(
    employeeId: number,
    from: Date,
    to: Date,
  ): Promise<Pick<Booking, 'startsAt' | 'endsAt'>[]>;
}
