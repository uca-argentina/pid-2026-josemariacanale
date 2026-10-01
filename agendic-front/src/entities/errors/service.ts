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

/** 422: the Empleado cannot offer the Servicio: they are not of its Negocio, or they were dados de baja. */
export class EmployeeNotAssignableError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 422: the Availability chosen for a Servicio belongs to another Empleado. */
export class AvailabilityNotOfEmployeeError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
