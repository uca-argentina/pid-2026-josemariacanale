export enum BookingStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  BOOKED = 'BOOKED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface Booking {
  id: number;
  serviceId: number;
  employeeId: number;
  clientName: string;
  clientEmail: string;
  /** startsAt minus the Servicio's Tiempo de preparación, fixed at booking: the Empleado is held from here. */
  prepStartsAt: Date;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  /** Comentario del Turno. */
  notes: string | null;
  /** Ausencia: when the Empleado marked it; null while not marked. */
  noShowAt: Date | null;
}

/** A Turno as its Empleado sees it in Mis turnos: with the names of where it happens. */
export interface EmployeeBooking extends Booking {
  serviceName: string;
  businessId: number;
  businessName: string;
  branchId: number;
  branchName: string;
}

export interface CreateBookingInput {
  serviceId: number;
  employeeId: number;
  startsAt: Date;
  clientName: string;
  clientEmail: string;
  notes?: string;
}

const VERIFICATION_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

export const bookingVerificationExpiresAt = (issuedAt: Date) =>
  new Date(issuedAt.getTime() + VERIFICATION_TOKEN_LIFETIME_MS);
