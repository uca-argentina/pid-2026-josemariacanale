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

/** Qué campo de la Repetición rechazó el back. */
export type ServiceRepetitionField = 'repeatEveryWeeks' | 'repeatMaxBookings';

/** Por qué el back rechazó la Repetición: falta uno de los dos campos, o uno está fuera de su rango. */
export type ServiceRepetitionReason = 'incomplete' | 'out-of-range';

/** 400: la Repetición del Servicio no es válida; `field` dice cuál de sus dos campos y `reason` por qué. */
export class ServiceRepetitionError extends Error {
    readonly field: ServiceRepetitionField;
    readonly reason: ServiceRepetitionReason;

    constructor(message: string, options: ErrorOptions & { field: ServiceRepetitionField; reason: ServiceRepetitionReason }) {
        super(message, options);
        this.field = options.field;
        this.reason = options.reason;
    }
}
