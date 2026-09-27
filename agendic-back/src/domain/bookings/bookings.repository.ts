import { Booking, BookingStatus } from './booking';

export const BOOKINGS_REPOSITORY = Symbol('BookingsRepository');

export interface CreateBookingData {
  serviceId: number;
  employeeId: number;
  clientName: string;
  clientEmail: string;
  startsAt: Date;
  endsAt: Date;
  status?: BookingStatus;
}

export interface BookingsRepository {
  /** Generates the id and a single-use token valid until expiresAt; only the token's hash is stored. */
  create(
    data: CreateBookingData,
    expiresAt: Date,
  ): Promise<{ booking: Booking; token: string }>;
  findById(id: number): Promise<Booking | null>;
  /** Whether a BOOKED or CONFIRMADO Booking of the same Empleado overlaps [startsAt, endsAt). */
  hasOverlappingBooked(
    employeeId: number,
    startsAt: Date,
    endsAt: Date,
  ): Promise<boolean>;
  /** Throws BusinessRuleError for an unknown, used or expired token. */
  findByVerificationToken(token: string, now: Date): Promise<Booking>;
  /** Moves an UNVERIFIED Booking to BOOKED. Throws ConflictError if it now overlaps a BOOKED Booking. */
  markBooked(id: number): Promise<Booking>;
  updateStatus(id: number, status: BookingStatus): Promise<Booking>;
  listByBusiness(businessId: number): Promise<Booking[]>;
  /** BOOKED Turnos of this Empleado, in any of their Servicios, overlapping [from, to). */
  listBookedByEmployee(
    employeeId: number,
    from: Date,
    to: Date,
  ): Promise<Pick<Booking, 'startsAt' | 'endsAt'>[]>;
}
