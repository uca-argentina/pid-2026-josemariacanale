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

/** El mensaje del 422 que pasa a `SlotUnavailableError` (ADR 0007); los demás 422 de Turnos son otra cosa. */
export const SLOT_UNAVAILABLE_MESSAGE = /^Slot .+ is not available for Service /;

/** 400: el Código de verificación no es válido para ese email, o venció (ADR 0022). */
export class InvalidVerificationCodeError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 429: ya se pidieron demasiados Códigos de verificación para ese email. */
export class TooManyVerificationCodeRequestsError extends Error {
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
