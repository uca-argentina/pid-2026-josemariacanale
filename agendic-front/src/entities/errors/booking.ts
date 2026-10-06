// 409: the Horario reservable was taken between showing it and confirming the Turno. Expected, not
// a bug: the Cliente picks another one.
export class SlotTakenError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/**
 * 422 `Slot <ISO> is not available for Service <id>`: al Reservar o Reagendar, el horario ya no está entre los
 * Horarios reservables. Esperable, no un bug: el Cliente elige otro.
 */
export class SlotUnavailableError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 403: el Usuario logueado no es el Empleado asignado a ese Turno. */
export class BookingNotAllowedError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/**
 * 422: el Turno no está en el estado que la acción pide (Aceptar y Rechazar piden pendiente; Cancelar,
 * Reagendar y Ausencia, aceptado) o, para Ausencia, su horario todavía no pasó o ya la tiene marcada.
 */
export class BookingStateError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
