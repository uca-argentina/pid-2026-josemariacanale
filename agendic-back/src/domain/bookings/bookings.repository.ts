import { HistoryBooking } from './booking-history';
import {
  Booking,
  BookingStatus,
  ClientBooking,
  PanelBooking,
  UpcomingBooking,
  UserBooking,
} from './booking';

export const BOOKINGS_REPOSITORY = Symbol('BookingsRepository');

export interface CreateBookingData {
  serviceId: number;
  employeeId: number | null;
  userId: number;
  /** The Cabina it occupies; null in a Servicio without Cabinas. */
  cabinId: number | null;
  clientName: string;
  clientEmail: string;
  prepStartsAt: Date;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
  employeeChosen: boolean;
  depositAmount: number | null;
  /** The Servicio's price at booking. */
  price: number;
  /** BOOKED, o PENDING si el Servicio tiene Aprobación manual. */
  status: BookingStatus.PENDING | BookingStatus.BOOKED;
  /** The clock's now if it is born BOOKED; null if PENDING. */
  acceptedAt: Date | null;
}

/** The Límite diario a verification must respect: at most `limit` PENDING or BOOKED Turnos of the Servicio starting in [from, to). */
export interface DailyLimitGuard {
  serviceId: number;
  limit: number;
  from: Date;
  to: Date;
}

/** El tramo `[prepStartsAt, endsAt)` durante el que un Turno ocupa una Cabina. */
export interface CabinOccupancy {
  cabinId: number;
  prepStartsAt: Date;
  endsAt: Date;
}

/** What Reagendar changes of a Turno: who attends it, where, and when. */
export type RescheduleTimes = Pick<
  Booking,
  'employeeId' | 'userId' | 'cabinId' | 'prepStartsAt' | 'startsAt' | 'endsAt'
>;

/** A Turno of a Serie to create: its data, the day it falls on and the Cabinas it may take. */
export interface SeriesBookingData {
  data: Omit<CreateBookingData, 'cabinId'>;
  /** `YYYY-MM-DD`, for the 409 that names the dates that failed. */
  date: string;
  /** Free Cabinas for its tramo, in the order of the ADR 0030 rule; empty in a Servicio without Cabinas. */
  cabinIds: number[];
  dailyLimit?: DailyLimitGuard;
}

export interface BookingsRepository {
  /**
   * Crea el Turno ya BOOKED o PENDING. Con `dailyLimit`, cuenta y crea serializado por Servicio (advisory lock), así
   * dos creaciones casi juntas no pueden pasar el Límite diario entre las dos.
   *
   * @throws {ConflictError} el horario ya lo ocupa otro Turno pendiente o aceptado del Empleado o de la Cabina, o el Servicio ya alcanzó su Límite diario ese día
   */
  create(data: CreateBookingData, dailyLimit?: DailyLimitGuard): Promise<Booking>;
  /**
   * Crea los Turnos de una Serie (#303) en una transacción, con un `seriesId` nuevo: todos o ninguno. Cada Turno toma
   * la Cabina del anterior de la Serie si está entre las suyas y si no la primera; si una Cabina choca prueba la
   * siguiente. Con `dailyLimit` cuenta serializado por Servicio, como `create`. Devuelve los Turnos en el orden dado.
   *
   * @throws {ConflictError} `Series dates not available: <fechas>`: en esas fechas el Empleado, el Límite diario o todas las Cabinas lo impiden
   */
  createSeries(items: SeriesBookingData[]): Promise<Booking[]>;
  /** When each of these Empleados last received a PENDING or BOOKED Turno of the Servicio (its `createdAt`); an Empleado with none is absent. Leaves out `excludeBookingId`. */
  lastReceivedByEmployee(
    serviceId: number,
    employeeIds: number[],
    excludeBookingId?: number,
  ): Promise<Map<number, Date>>;
  /** When each of these Cabinas last received a PENDING or BOOKED Turno of any Servicio (its `createdAt`); a Cabina with none is absent. Leaves out `excludeBookingId`. */
  lastReceivedByCabin(
    cabinIds: number[],
    excludeBookingId?: number,
  ): Promise<Map<number, Date>>;
  /** PENDING and BOOKED Turnos, of any Servicio, that occupy one of these Cabinas and whose [prepStartsAt, endsAt) overlaps [from, to), leaving out `excludeBookingId`. */
  listOccupiedByCabins(
    cabinIds: number[],
    from: Date,
    to: Date,
    excludeBookingId?: number,
  ): Promise<CabinOccupancy[]>;
  /** How many PENDING or BOOKED Turnos occupy the Cabina and end after `now`. */
  countUpcomingByCabin(cabinId: number, now: Date): Promise<number>;
  /** startsAt of the Servicio's PENDING and BOOKED Turnos, of every Empleado, starting in [from, to), leaving out `excludeBookingId`. */
  listOccupiedStartsByService(
    serviceId: number,
    from: Date,
    to: Date,
    excludeBookingId?: number,
  ): Promise<Date[]>;
  /** Throws NotFoundError for an unknown id. */
  findById(id: number): Promise<Booking>;
  /** Moves a PENDING Booking to BOOKED (setting `acceptedAt` to `now`) or REJECTED (setting `rejectedAt` to `now`, `cancelledBy` EMPLOYEE and `reason`). Throws BusinessRuleError if it is no longer PENDING. */
  resolvePending(
    id: number,
    status: BookingStatus.BOOKED | BookingStatus.REJECTED,
    now: Date,
    reason: string | null,
  ): Promise<Booking>;
  /** The Turno and the originals it replaced by Reagendar (ADR 0031), oldest first, the Turno last. Throws NotFoundError for an unknown id. */
  findHistoryChain(id: number): Promise<HistoryBooking[]>;
  /** The Turno for its Enlace del Turno, in any status, with the data to show it (ADR 0022). Throws NotFoundError for an unknown link. */
  findByLink(link: string): Promise<ClientBooking>;
  listByBusiness(businessId: number): Promise<PanelBooking[]>;
  /** PENDING and BOOKED Turnos of this Usuario, personal or of any Negocio, whose [prepStartsAt, endsAt) overlaps [from, to), leaving out `excludeBookingId`. */
  listOccupiedByUser(
    userId: number,
    from: Date,
    to: Date,
    excludeBookingId?: number,
  ): Promise<Pick<Booking, 'prepStartsAt' | 'endsAt'>[]>;
  /**
   * PENDING and BOOKED Turnos of this Usuario starting at or after `from`, by `startsAt`, each with the zone of the
   * Availability it is attended with: the Empleado's for the Servicio, or the Servicio personal's.
   */
  listUpcomingByUser(userId: number, from: Date): Promise<UpcomingBooking[]>;
  /**
   * Every Turno, in any status, the Usuario attends: of their Servicios personales and of the Negocios where
   * they are still an active Empleado.
   */
  listByUser(userId: number): Promise<UserBooking[]>;
  /** Moves a BOOKED Booking to CANCELLED, with `cancelledAt` = `now`, `cancelledBy` EMPLOYEE and `reason`. Throws BusinessRuleError if it is no longer BOOKED. */
  cancel(id: number, now: Date, reason: string | null): Promise<Booking>;
  /** As `cancel`, by Enlace del Turno (ADR 0022): also from PENDING, with `cancelledBy` CLIENT. Throws BusinessRuleError if it is no longer pending or booked. */
  cancelPendingOrBooked(id: number, now: Date, reason: string | null): Promise<ClientBooking>;
  /**
   * Reagendar (ADR 0031): cancels the BOOKED Turno as rescheduled (`cancelledAt` = `now`, `cancelledBy` EMPLOYEE, no reason) and creates the one at the new times, with the given Empleado, Usuario and Cabina, in one transaction. The new Turno takes the Enlace del Turno and copies the Cliente, Comentario, Empleado elegido, price and Seña. Returns the new Turno. Throws BusinessRuleError if it is no longer BOOKED, ConflictError if it now overlaps another.
   */
  reschedule(id: number, times: RescheduleTimes, now: Date): Promise<PanelBooking>;
  /** As `reschedule`, by Enlace del Turno (ADR 0022): the original gets `cancelledBy` CLIENT, also from PENDING, and sets the new status (PENDING again with Aprobación manual). Throws BusinessRuleError if it is no longer pending or booked, ConflictError if it now overlaps another. */
  reschedulePendingOrBooked(
    id: number,
    times: RescheduleTimes & Pick<Booking, 'status'>,
    now: Date,
  ): Promise<ClientBooking>;
  /** Sets noShowAt on a BOOKED Booking whose endsAt has passed and has none yet. Throws BusinessRuleError otherwise. */
  markNoShow(id: number, now: Date): Promise<Booking>;
  /** Clears noShowAt on a BOOKED Booking that still has it. Throws BusinessRuleError otherwise. */
  unmarkNoShow(id: number): Promise<Booking>;
  /** Sets depositPaidAt on a PENDING or BOOKED Booking that has a Seña, not yet paid, and has not started. Throws BusinessRuleError otherwise. */
  payDeposit(id: number, now: Date): Promise<ClientBooking>;
  /** Sets employeeNoShowAt on a BOOKED Booking inside its window with no Ausencia or Falta del Empleado yet. Throws BusinessRuleError otherwise. */
  markEmployeeNoShow(id: number, now: Date): Promise<ClientBooking>;
  /** Saves the Calificación of the Turno. Throws ConflictError if it already has one, even if another request wins the race. */
  rate(id: number, score: number, comment: string | null): Promise<ClientBooking>;
  /** Turnos in any status with an Enlace del Turno, no Invitación a calificar sent yet, and `endsAt` in [from, to]. */
  listUnrequestedByEndsAtBetween(from: Date, to: Date): Promise<ClientBooking[]>;
  /** Sets ratingRequestSentAt to `now`. Throws NotFoundError for an unknown id. */
  markRatingRequestSent(id: number, now: Date): Promise<void>;
}
