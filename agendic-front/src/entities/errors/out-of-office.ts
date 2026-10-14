/**
 * 422: el back rechazó un período Fuera de la oficina porque la fecha de fin es anterior a la de inicio. El
 * `message` es el del back y se muestra tal cual.
 */
export class OutOfOfficeRuleError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/**
 * 409: el Usuario ya tiene un período Fuera de la oficina con esas mismas fechas. El `message` es el del back y
 * se muestra tal cual.
 */
export class OutOfOfficeConflictError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** Mensaje exacto con el que el back distingue este 409 del de período duplicado. */
export const LEFT_OUTSIDE_BOOKINGS_CHANGED_MESSAGE = 'Los Turnos que quedan fuera de tu horario cambiaron';

/**
 * 409: entre la vista previa y la escritura cambió la lista de Turnos que quedan afuera, y el back no guardó
 * nada. El Usuario no ve este mensaje: se le muestra la lista nueva.
 */
export class LeftOutsideBookingsChangedError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
