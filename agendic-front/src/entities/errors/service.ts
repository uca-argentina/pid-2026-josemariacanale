/** 409: another active Servicio of the Sucursal already uses that tramo of the Enlace de reserva. */
export class ServiceSlugTakenError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 409: another active Servicio of the Sucursal already has that name, in any casing. */
export class ServiceNameTakenError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
