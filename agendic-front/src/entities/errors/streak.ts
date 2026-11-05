/** 422: el Servicio gratis no es del alcance de las Rachas o está dado de baja. */
export class FreeServiceNotAllowedError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
