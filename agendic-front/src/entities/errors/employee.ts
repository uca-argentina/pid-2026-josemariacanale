// 422: the Empleado is the last one attending a Servicio, so they cannot be dado de baja.
export class LastEmployeeError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

// 409: the User is already an Employee in this Business.
export class EmployeeAlreadyExistsError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

// 422: the email doesn't belong to a registered User.
export class UserNotRegisteredError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

// 422: cannot retire the Owner of the Business.
export class CannotRetireOwnerError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
