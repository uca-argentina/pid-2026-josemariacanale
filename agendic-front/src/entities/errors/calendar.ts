/**
 * 409: el Usuario ya tiene un Calendario conectado. El `message` es el del back
 * (`Calendar already connected for User <id>`).
 */
export class CalendarAlreadyConnectedError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/**
 * 503: el deploy del back no tiene configurado Google Calendar. La pantalla deshabilita la opción de conectar y lo
 * explica; el `message` del back no se muestra.
 */
export class CalendarNotConfiguredError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
