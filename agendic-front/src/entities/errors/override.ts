/**
 * 422: el back rechazó la Anulación (Franjas solapadas o que no terminan después de empezar, o una
 * Cobertura que no atiende los mismos Servicios). El `message` es el del back y se muestra tal cual.
 */
export class OverrideRuleError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 409: la Cobertura choca con un Turno del compañero. El `message` es el del back y se muestra tal cual. */
export class OverrideConflictError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
