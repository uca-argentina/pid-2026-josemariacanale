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
 * Reagendar y las Ausencias, aceptado) o, para las Ausencias, su horario todavía no pasó o ya tiene una marcada.
 * Del Cliente: no está pendiente ni aceptado, o ya empezó.
 */
export class BookingStateError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 409 al Calificar: el Turno ya tiene su Calificación (una por Turno). Esperable: el Cliente la ve en solo lectura. */
export class BookingAlreadyRatedError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 400 al Cancelar o Rechazar: el Motivo de cancelación pasa del largo máximo (`CANCELLATION_REASON_MAX_LENGTH`). */
export class CancellationReasonTooLongError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** El mensaje exacto del 400 de un Motivo de cancelación demasiado largo (ADR 0007). */
export const CANCELLATION_REASON_TOO_LONG_MESSAGE = 'reason is too long';

/**
 * 409 al Reservar una Serie: alguna de sus fechas ya no se puede Reservar (Turno tomado, Fuera de la oficina, Día
 * festivo, Límite diario, sin Cabina libre). `dates` son esas fechas, `YYYY-MM-DD`; no se creó ningún Turno y el
 * Código de verificación sigue sirviendo para reintentar sin ellas.
 */
export class SeriesDatesUnavailableError extends Error {
    readonly dates: string[];

    constructor(message: string, options: ErrorOptions & { dates: string[] }) {
        super(message, options);
        this.dates = options.dates;
    }
}

/** 422 al Reservar una Serie: sin las fechas que se saltean quedan menos de 2 Turnos. */
export class SeriesTooShortError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** El mensaje exacto del 422 de una Serie que, sin las fechas salteadas, queda con menos de 2 Turnos (ADR 0007). */
export const SERIES_TOO_SHORT_MESSAGE = 'A Serie needs at least 2 Turnos';
