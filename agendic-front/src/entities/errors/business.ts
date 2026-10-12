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

/** 422: la Sucursal ya tiene sus cinco imágenes. */
export class BranchImageLimitError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** Por qué el back rechazó las imágenes de una Sucursal nueva: su tipo, su peso o cuántas son. */
export type BranchImagesRejection = 'type' | 'size' | 'count';

/** 400 o 413: el back rechazó las imágenes de una Sucursal nueva; `reason` dice por qué. */
export class BranchImagesRejectedError extends Error {
    readonly reason: BranchImagesRejection;

    constructor(message: string, options: ErrorOptions & { reason: BranchImagesRejection }) {
        super(message, options);
        this.reason = options.reason;
    }
}

/** 409: es la última imagen de la Sucursal, que nunca queda sin imágenes. */
export class LastBranchImageError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
