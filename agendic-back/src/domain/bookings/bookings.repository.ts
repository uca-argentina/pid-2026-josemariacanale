import { Booking, BookingStatus, ClientBooking, UserBooking } from './booking';

export const BOOKINGS_REPOSITORY = Symbol('BookingsRepository');

export interface CreateBookingData {
  serviceId: number;
  employeeId: number | null;
  userId: number;
  clientName: string;
  clientEmail: string;
  prepStartsAt: Date;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
  /** BOOKED, o PENDING si el Servicio tiene Aprobación manual. */
  status: BookingStatus.PENDING | BookingStatus.BOOKED;
}

/** The Límite diario a verification must respect: at most `limit` PENDING or BOOKED Turnos of the Servicio starting in [from, to). */
export interface DailyLimitGuard {
  serviceId: number;
  limit: number;
  from: Date;
  to: Date;
}

export interface BookingsRepository {
  /**
   * Crea el Turno ya BOOKED o PENDING. Con `dailyLimit`, cuenta y crea serializado por Servicio (advisory lock), así
   * dos creaciones casi juntas no pueden pasar el Límite diario entre las dos.
   *
   * @throws {ConflictError} el horario ya lo ocupa otro Turno pendiente o aceptado del Empleado, o el Servicio ya alcanzó su Límite diario ese día
   */
  create(data: CreateBookingData, dailyLimit?: DailyLimitGuard): Promise<Booking>;
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
  /** Throws NotFoundError for an unknown id. */
  findById(id: number): Promise<Booking>;
  /** Moves a PENDING Booking to BOOKED or REJECTED. Throws BusinessRuleError if it is no longer PENDING. */
  resolvePending(
    id: number,
    status: BookingStatus.BOOKED | BookingStatus.REJECTED,
  ): Promise<Booking>;
  /** The Turno for its Enlace del Turno, in any status, with the data to show it (ADR 0022). Throws NotFoundError for an unknown link. */
  findByLink(link: string): Promise<ClientBooking>;
  listByBusiness(businessId: number): Promise<Booking[]>;
  /** PENDING and BOOKED Turnos of this Usuario, personal or of any Negocio, whose [prepStartsAt, endsAt) overlaps [from, to), leaving out `excludeBookingId`. */
  listOccupiedByUser(
    userId: number,
    from: Date,
    to: Date,
    excludeBookingId?: number,
  ): Promise<Pick<Booking, 'prepStartsAt' | 'endsAt'>[]>;
  /**
   * Every Turno, in any status, the Usuario attends: of their Servicios personales and of the Negocios where
   * they are still an active Empleado.
   */
  listByUser(userId: number): Promise<UserBooking[]>;
  /** Moves a BOOKED Booking to CANCELLED. Throws BusinessRuleError if it is no longer BOOKED. */
  cancel(id: number): Promise<Booking>;
  /** As `cancel`, by Enlace del Turno (ADR 0022): also from PENDING. Throws BusinessRuleError if it is no longer pending or booked. */
  cancelPendingOrBooked(id: number): Promise<ClientBooking>;
  /** Moves a BOOKED Booking to the new times, with the given Empleado and Usuario (the same or another). Throws BusinessRuleError if it is no longer BOOKED, ConflictError if it now overlaps another. */
  reschedule(
    id: number,
    times: Pick<Booking, 'employeeId' | 'userId' | 'prepStartsAt' | 'startsAt' | 'endsAt'>,
  ): Promise<Booking>;
  /** As `reschedule`, by Enlace del Turno (ADR 0022): also from PENDING, and sets the new status (PENDING again with Aprobación manual). Throws BusinessRuleError if it is no longer pending or booked, ConflictError if it now overlaps another. */
  reschedulePendingOrBooked(
    id: number,
    times: Pick<
      Booking,
      'employeeId' | 'userId' | 'prepStartsAt' | 'startsAt' | 'endsAt' | 'status'
    >,
  ): Promise<ClientBooking>;
  /** Sets noShowAt on a BOOKED Booking whose endsAt has passed and has none yet. Throws BusinessRuleError otherwise. */
  markNoShow(id: number, now: Date): Promise<Booking>;
}
