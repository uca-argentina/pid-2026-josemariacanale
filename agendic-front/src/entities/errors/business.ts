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
