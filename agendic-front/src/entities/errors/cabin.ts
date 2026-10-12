/** 409: otra Cabina activa de la Sucursal ya tiene ese nombre, sin distinguir mayúsculas. */
export class CabinNameTakenError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 400: el nombre de la Cabina está vacío o tiene más de 60 caracteres. */
export class InvalidCabinNameError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
