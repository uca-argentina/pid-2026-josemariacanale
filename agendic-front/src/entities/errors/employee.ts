// 422: the Empleado is the last one attending a Servicio, so they cannot be dado de baja.
export class LastEmployeeError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
