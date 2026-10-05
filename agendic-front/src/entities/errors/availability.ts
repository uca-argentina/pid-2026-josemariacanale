/**
 * 422: el back rechazó la regla de una Availability (Franjas que no terminan después de empezar o que se
 * pisan, zona horaria inválida, o borrar la predeterminada o una que atiende un Servicio). El `message` es
 * el del back y se muestra tal cual.
 */
export class AvailabilityRuleError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
