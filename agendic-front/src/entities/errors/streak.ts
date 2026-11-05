/** 422: el Servicio gratis no es del alcance de las Rachas o está dado de baja. */
export class FreeServiceNotAllowedError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 409: el Premio ya se Canjeó, por ejemplo desde otra pestaña. */
export class PrizeAlreadyRedeemedError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 422 `Prize <id> expired`: el Premio venció. */
export class PrizeExpiredError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 422 `Prize <id> belongs to another Ficha del Cliente`: el Premio es de otro email o de otro Negocio. */
export class PrizeOfAnotherClientError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** El mensaje del 422 que pasa a `PrizeExpiredError` (ADR 0007). */
export const PRIZE_EXPIRED_MESSAGE = /^Prize \d+ expired$/;

/** El mensaje del 422 que pasa a `PrizeOfAnotherClientError` (ADR 0007). */
export const PRIZE_OF_ANOTHER_CLIENT_MESSAGE = /^Prize \d+ belongs to another Ficha del Cliente$/;
