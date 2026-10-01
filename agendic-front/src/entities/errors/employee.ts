// 422: the Empleado is the last one attending a Servicio, so they cannot be dado de baja.
export class LastEmployeeError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 422: el email invitado ya es Empleado del Negocio. */
export class AlreadyEmployeeError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
