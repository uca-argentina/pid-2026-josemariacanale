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
  /** Enlace del Turno (ADR 0022): identificador secreto, único y no adivinable que abre este Turno sin Código de verificación. */
  link: string;
}

/** A Turno as its Empleado sees it in Mis turnos: with the names of where it happens. */
export interface EmployeeBooking extends Booking {
  serviceName: string;
  businessId: number;
  businessName: string;
  branchId: number;
  branchName: string;
}

/** A Turno as its Enlace del Turno shows it (ADR 0022): with the Servicio, Negocio and Sucursal data to show it. */
export interface ClientBooking extends Booking {
  /** The Sucursal's time zone, or the Availability's in a Servicio personal. */
  timeZone: string;
  /** The Empleado's name, or the attending Usuario's own in a Servicio personal. */
  employeeName: string;
  service: {
    name: string;
    durationMinutes: number;
    price: number;
    depositPercent: number | null;
  };
  /** Null in a Servicio personal. */
  business: { name: string; slug: string } | null;
  /** Null in a Servicio personal. */
  branch: {
    name: string;
    slug: string;
    address: string;
    /** The first Imagen de Sucursal by order, if there is one. */
    coverUrl: string | null;
  } | null;
  /** The Enlace de reserva del Usuario that attends a Servicio personal. Null in a Servicio del Negocio. */
  user: { slug: string | null } | null;
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
