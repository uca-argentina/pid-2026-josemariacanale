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
 * 409: el Calendario conectado del Usuario está `DISCONNECTED` (Google dejó de aceptar su permiso). La pantalla muestra
 * el aviso de reconectar. El `message` es el del back (`Calendario conectado of User <id> is disconnected`).
 */
export class CalendarDisconnectedError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/**
 * 422: se tildó un calendario que no es de la cuenta conectada y no se guardó nada. La pantalla recarga la lista. El
 * `message` es el del back (`Calendar <id> is not in the connected account`).
 */
export class CalendarNotInAccountError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 502: Google no respondió al leer los calendarios de la cuenta. La pantalla pide reintentar. */
export class CalendarsUnavailableError extends Error {
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
