/**
 * 422 al dar de baja: el Empleado es el Dueño o el último Empleado de un Servicio.
 * El `message` es del back y se muestra tal cual.
 */
export class LastEmployeeError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/**
 * 422 al agregar: no hay un Usuario con ese email. El `message` del back se muestra bajo el campo.
 */
export class EmployeeUserNotFoundError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/**
 * 409 al agregar: esa persona ya es Empleado activo del Negocio. El `message` del back se muestra bajo el campo.
 */
export class EmployeeAlreadyExistsError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
