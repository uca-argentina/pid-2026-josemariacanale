export class UnauthenticatedError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** El Usuario tiene Sesión pero no puede hacer lo que pidió (403 del back). */
export class UnauthorizedError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
