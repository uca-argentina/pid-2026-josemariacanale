export enum BookingStatus {
  PENDING = 'PENDING',
  BOOKED = 'BOOKED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface Booking {
  id: number;
  serviceId: number;
  /** The Empleado of a Servicio del Negocio; null in a Servicio personal. */
  employeeId: number | null;
  /** The Usuario who attends it: the one whose agenda it occupies. */
  userId: number;
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
  startsAt: Date;
  clientName: string;
  clientEmail: string;
  notes?: string;
  /** El Código de verificación pedido para clientEmail (ADR 0022). */
  code: string;
}

/** The 409 of a Servicio whose Límite diario that day is already reached, wherever it is detected. */
export const DAILY_LIMIT_REACHED = 'The Service reached its Límite diario that day';
