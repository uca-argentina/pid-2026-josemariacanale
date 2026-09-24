// 409: another Negocio already uses that Enlace de reserva.
export class SlugTakenError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

// 400: the Enlace de reserva does not have a valid format.
export class InvalidSlugError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

// 409: the Usuario is already Dueño of a Negocio (ADR 0012).
export class AlreadyOwnerError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
