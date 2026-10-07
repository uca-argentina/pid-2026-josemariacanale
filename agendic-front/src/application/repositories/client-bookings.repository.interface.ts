import type { ClientAccess, ClientBooking } from '@/src/entities/models/client-booking';

/**
 * Turnos del Cliente (ADR 0022), sin cookie ni Sesión: los de Mis turnos, con un acceso de 15 minutos atado a su
 * email, y el de un Enlace del Turno, que alcanza por sí solo para ese Turno.
 */
export interface IClientBookingsRepository {
    /**
     * Cambia un Código de verificación vigente por un acceso de 15 minutos a Mis turnos.
     *
     * @throws {InvalidVerificationCodeError} el código no es válido para email, o venció (400)
     */
    openAccess(email: string, code: string): Promise<ClientAccess>;

    /**
     * Todos los Turnos del email del acceso, en cualquier Negocio o Servicio personal.
     *
     * @throws {ClientAccessExpiredError} el acceso falta o venció (401)
     */
    listBookings(access: string): Promise<ClientBooking[]>;

    /**
     * @throws {ClientAccessExpiredError} el acceso falta o venció (401)
     * @throws {NotFoundError} el Turno no existe o no es de este email (404)
     * @throws {BookingStateError} el Turno no está pendiente ni aceptado, o ya empezó (422)
     */
    cancel(access: string, bookingId: number): Promise<ClientBooking>;

    /**
     * Reagenda a otro Horario reservable del mismo Servicio.
     *
     * @throws {ClientAccessExpiredError} el acceso falta o venció (401)
     * @throws {NotFoundError} el Turno no existe o no es de este email (404)
     * @throws {SlotTakenError} el horario nuevo pisa otro Turno del Empleado (409)
     * @throws {SlotUnavailableError} `startsAt` no es un Horario reservable de ningún Empleado (422)
     * @throws {BookingStateError} el Turno no está pendiente ni aceptado (422)
     */
    reschedule(access: string, bookingId: number, startsAt: string): Promise<ClientBooking>;

    /**
     * Busca el Turno de un Enlace del Turno, en cualquier estado.
     *
     * @throws {NotFoundError} el Enlace no es de ningún Turno (404)
     */
    getBookingByLink(link: string): Promise<ClientBooking>;

    /**
     * Cancela el Turno de un Enlace del Turno.
     *
     * @throws {NotFoundError} el Enlace no es de ningún Turno (404)
     * @throws {BookingStateError} el Turno no está pendiente ni aceptado, o ya empezó (422)
     */
    cancelBookingByLink(link: string): Promise<ClientBooking>;

    /**
     * Reagenda el Turno de un Enlace del Turno a otro Horario reservable del mismo Servicio.
     *
     * @throws {NotFoundError} el Enlace no es de ningún Turno (404)
     * @throws {SlotTakenError} el horario nuevo pisa otro Turno del Empleado (409)
     * @throws {SlotUnavailableError} `startsAt` no es un Horario reservable de ningún Empleado (422)
     * @throws {BookingStateError} el Turno no está pendiente ni aceptado (422)
     */
    rescheduleBookingByLink(link: string, startsAt: string): Promise<ClientBooking>;
}
