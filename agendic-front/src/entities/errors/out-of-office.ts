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
