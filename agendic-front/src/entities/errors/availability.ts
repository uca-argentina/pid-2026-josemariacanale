/**
 * 422: el back rechazó la regla de una Availability (Franjas solapadas o que no terminan después de
 * empezar, o borrar la predeterminada). El `message` es el del back y se muestra tal cual.
 */
export class AvailabilityRuleError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 409: algún Servicio usa la Availability. El `message` del back dice cuántos y se muestra tal cual. */
export class AvailabilityInUseError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
