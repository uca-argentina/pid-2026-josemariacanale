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
  /** The Cabina it occupies over the same tramo (ADR 0030); null in a Servicio without Cabinas and in Turnos taken before it admitted them. */
  cabinId: number | null;
  /** startsAt minus the Servicio's Tiempo de preparación, fixed at booking: the Empleado is held from here. */
  prepStartsAt: Date;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  /** Comentario del Turno. */
  notes: string | null;
  /** Ausencia: when the Empleado marked it; null while not marked. */
  noShowAt: Date | null;
  /** Enlace del Turno (ADR 0022): identificador secreto, único y no adivinable que abre este Turno sin Código de verificación. Al Reagendar pasa al Turno nuevo y el original queda sin Enlace. */
  link: string | null;
  /** The original Turno this one replaced when Reagendar (ADR 0031); null if it was not born from one. */
  fromRescheduleId: number | null;
  /** Empleado elegido: the Cliente came in by this Empleado's Enlace de reserva, so the Turno stays with them. */
  employeeChosen: boolean;
  /** Seña del Turno, fixed at booking (see `depositAmountFor`); null if the Servicio asked for none. */
  depositAmount: number | null;
  /** Pagar la Seña: when the Cliente paid it; null while it is pending. */
  depositPaidAt: Date | null;
  /** The Servicio's price fixed at booking: later changes to the Servicio don't touch it. */
  price: number;
  /** Cancelar: when it was cancelled, from the clock; null unless CANCELLED. */
  cancelledAt: Date | null;
  /** Rechazar turno: when it was rejected, from the clock; null unless REJECTED. */
  rejectedAt: Date | null;
}

/**
 * Monto de la Seña de un Turno: price × depositPercent / 100, rounded half up to the cent. Null when the Servicio asks for
 * none or for 0%.
 */
export const depositAmountFor = (
  price: number,
  depositPercent: number | null,
): number | null => {
  if (!depositPercent) return null;
  // price × percent is the amount in cents; toFixed absorbs float noise such as 10.05 × 15 = 150.74999…
  return Math.round(Number((price * depositPercent).toFixed(6))) / 100;
};

/** Who to send an Aviso de cambio del Turno to: the Cliente's email and the Turno's Enlace del Turno. */
export type ClientNotice = Pick<Booking, 'clientEmail' | 'link'>;

/** A Turno as the panel shows it (ADR 0030): with the Cabina it occupies, which the Cliente never sees. */
export interface PanelBooking extends Booking {
  /** Still named once dada de baja; null in a Turno without Cabina. */
  cabin: { id: number; name: string } | null;
}

/** A pending or accepted Turno still to come, with the zone of the Availability its Usuario attends it with. */
export interface UpcomingBooking
  extends Pick<Booking, 'id' | 'startsAt' | 'clientName'> {
  timeZone: string;
}

/** A Turno as the Usuario who attends it sees it in Mis turnos (ADR 0023): with the names of where it happens. */
export interface UserBooking extends PanelBooking {
  serviceName: string;
  /** Null in a Servicio personal, together with `branch`. */
  business: { id: number; name: string } | null;
  /** Null in a Servicio personal, together with `business`. */
  branch: { id: number; name: string } | null;
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
  /** Empleado elegido: only this Empleado is considered, with no round robin. Servicio del Negocio only. */
  employeeId?: number;
  /** El Código de verificación pedido para clientEmail (ADR 0022). */
  code: string;
}

/** The 409 of a Servicio whose Límite diario that day is already reached, wherever it is detected. */
export const DAILY_LIMIT_REACHED = 'The Service reached its Límite diario that day';
