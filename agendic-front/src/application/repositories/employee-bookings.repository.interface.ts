import type { EmployeeBooking } from '@/src/entities/models/employee-booking';

/**
 * Turnos del Empleado con Sesión.
 *
 * Las acciones las puede hacer solo el Empleado asignado al Turno; el back responde 403 si no lo es
 * y 404 si el Turno no existe.
 */
export interface IEmployeeBookingsRepository {
    /**
     * Los Turnos de todos los Negocios donde el Usuario es Empleado activo; vacía si no es Empleado.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     */
    listMyBookings(): Promise<EmployeeBooking[]>;

    /**
     * Acepta un Turno pendiente.
     *
     * @throws {BookingNotAllowedError} no es su Turno (403)
     * @throws {NotFoundError} el Turno no existe (404)
     * @throws {BookingStateError} no está pendiente (422)
     */
    accept(bookingId: number): Promise<void>;

    /**
     * Rechaza un Turno pendiente.
     *
     * @throws {BookingNotAllowedError} no es su Turno (403)
     * @throws {NotFoundError} el Turno no existe (404)
     * @throws {BookingStateError} no está pendiente (422)
     */
    reject(bookingId: number): Promise<void>;

    /**
     * Cancela un Turno aceptado.
     *
     * @throws {BookingNotAllowedError} no es su Turno (403)
     * @throws {NotFoundError} el Turno no existe (404)
     * @throws {BookingStateError} no está aceptado (422)
     */
    cancel(bookingId: number): Promise<void>;

    /**
     * Reagenda un Turno aceptado a otro Horario reservable del mismo Servicio y Empleado.
     *
     * @throws {BookingNotAllowedError} no es su Turno (403)
     * @throws {NotFoundError} el Turno no existe (404)
     * @throws {SlotTakenError} el horario choca con otro Turno del Empleado (409)
     * @throws {BookingStateError} no está aceptado (422)
     */
    reschedule(bookingId: number, startsAt: string): Promise<void>;

    /**
     * Marca la Ausencia de un Turno aceptado cuyo horario ya pasó.
     *
     * @throws {BookingNotAllowedError} no es su Turno (403)
     * @throws {NotFoundError} el Turno no existe (404)
     * @throws {BookingStateError} no está aceptado, su horario no pasó o ya tiene Ausencia (422)
     */
    markNoShow(bookingId: number): Promise<void>;
}
