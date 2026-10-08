import type { ClientBooking } from '@/src/entities/models/client-booking';

/**
 * El Turno de un Enlace del Turno (ADR 0022), sin cookie ni Sesión: el Enlace alcanza por sí solo para verlo,
 * Cancelarlo y Reagendarlo.
 */
export interface IClientBookingsRepository {
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
