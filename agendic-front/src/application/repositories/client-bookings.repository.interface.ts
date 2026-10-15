import type { CancelledSeries, ClientBooking } from '@/src/entities/models/client-booking';

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
     * Cancela el Turno de un Enlace del Turno, con un Motivo de cancelación opcional.
     *
     * @throws {NotFoundError} el Enlace no es de ningún Turno (404)
     * @throws {BookingStateError} el Turno no está pendiente ni aceptado, o ya empezó (422)
     * @throws {CancellationReasonTooLongError} el Motivo es demasiado largo (400)
     */
    cancelBookingByLink(link: string, reason?: string): Promise<ClientBooking>;
    /**
     * Cancela el Turno de un Enlace del Turno y los siguientes de su Serie, con un Motivo de cancelación opcional (#305).
     *
     * @throws {NotFoundError} el Enlace no es de ningún Turno (404)
     * @throws {BookingStateError} el Turno no se puede Cancelar, o no es de una Serie (422)
     * @throws {CancellationReasonTooLongError} el Motivo es demasiado largo (400)
     */
    cancelBookingSeriesByLink(link: string, reason?: string): Promise<CancelledSeries>;

    /**
     * Paga la Seña del Turno de un Enlace del Turno (simulado: Agendic no cobra).
     *
     * @throws {NotFoundError} el Enlace no es de ningún Turno (404)
     * @throws {BookingStateError} el Turno no está pendiente ni aceptado, ya empezó, no tiene Seña o ya la tiene pagada (422)
     */
    payDepositByLink(link: string): Promise<ClientBooking>;

    /**
     * Marca la Ausencia del Anfitrión en el Turno de un Enlace del Turno.
     *
     * @throws {NotFoundError} el Enlace no es de ningún Turno (404)
     * @throws {BookingStateError} el Turno no está aceptado, no empezó, venció el plazo, tiene Ausencia del Invitado, ya tiene la del Anfitrión o no admite marcarla (422)
     */
    markEmployeeNoShowByLink(link: string): Promise<ClientBooking>;

    /**
     * Califica el Turno de un Enlace del Turno de 1 a 5, con un comentario opcional.
     *
     * @throws {NotFoundError} el Enlace no es de ningún Turno (404)
     * @throws {BookingStateError} el Turno no se puede calificar (422)
     * @throws {BookingAlreadyRatedError} el Turno ya tiene su Calificación (409)
     */
    rateBookingByLink(link: string, rating: { score: number; comment?: string }): Promise<ClientBooking>;

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
