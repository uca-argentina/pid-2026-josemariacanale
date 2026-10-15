import type { UserBooking } from '@/src/entities/models/user-booking';

/**
 * Turnos que atiende el Usuario con Sesión.
 *
 * Las acciones las puede hacer solo quien atiende el Turno; el back responde 403 si no lo es
 * y 404 si el Turno no existe.
 */
export interface IUserBookingsRepository {
    /**
     * Los Turnos de sus Servicios personales y de los Negocios donde es Empleado activo (ADR 0023).
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     */
    listMyBookings(): Promise<UserBooking[]>;

    /**
     * Acepta un Turno pendiente.
     *
     * @throws {BookingNotAllowedError} no es su Turno (403)
     * @throws {NotFoundError} el Turno no existe (404)
     * @throws {BookingStateError} no está pendiente (422)
     */
    accept(bookingId: number): Promise<void>;

    /**
     * Rechaza un Turno pendiente, con un Motivo de cancelación opcional.
     *
     * @throws {BookingNotAllowedError} no es su Turno (403)
     * @throws {NotFoundError} el Turno no existe (404)
     * @throws {BookingStateError} no está pendiente (422)
     * @throws {CancellationReasonTooLongError} el Motivo es demasiado largo (400)
     */
    reject(bookingId: number, reason?: string): Promise<void>;

    /**
     * Cancela un Turno aceptado, con un Motivo de cancelación opcional.
     *
     * @throws {BookingNotAllowedError} no es su Turno (403)
     * @throws {NotFoundError} el Turno no existe (404)
     * @throws {BookingStateError} no está aceptado (422)
     * @throws {CancellationReasonTooLongError} el Motivo es demasiado largo (400)
     */
    cancel(bookingId: number, reason?: string): Promise<void>;

    /**
     * Reagenda un Turno aceptado a otro Horario reservable del mismo Servicio y Empleado. El back lo
     * reemplaza por un Turno nuevo (ADR 0031): devuelve su `id`, distinto del de `bookingId`.
     *
     * @throws {BookingNotAllowedError} no es su Turno (403)
     * @throws {NotFoundError} el Turno no existe (404)
     * @throws {SlotTakenError} el horario choca con otro Turno del Empleado (409)
     * @throws {BookingStateError} no está aceptado (422)
     * @throws {ApiRequestError} la respuesta no trae el `id` del Turno nuevo
     */
    reschedule(bookingId: number, startsAt: string): Promise<{ id: number }>;

    /**
     * Marca la Ausencia del Invitado de un Turno aceptado cuyo horario ya pasó.
     *
     * @throws {BookingNotAllowedError} no es su Turno (403)
     * @throws {NotFoundError} el Turno no existe (404)
     * @throws {BookingStateError} no está aceptado, su horario no pasó o ya tiene Ausencia del Invitado (422)
     */
    markNoShow(bookingId: number): Promise<void>;
}
