/**
 * 409 `Date <date> is not fully booked for Service <id>`: al anotarse en la Lista de espera, el día ya tiene
 * Horarios reservables. Esperable, no un bug: el Cliente ve que hay lugar y Reserva.
 */
export class WaitlistDayNotFullError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 422 `Date <date> is in the past`: la fecha de la Anotación ya pasó. Esperable: el Cliente elige otro día. */
export class WaitlistDateInPastError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
