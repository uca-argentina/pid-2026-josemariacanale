/** El back dio de baja al Usuario pero no pudo borrarlo en el Proveedor de autenticación (502); repetir la baja es seguro. */
export class AuthProviderDeletionError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
