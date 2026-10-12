/**
 * 503: el deploy del back no tiene configurados los Días festivos (ADR 0028). El `message` es el del back
 * (`Días festivos no configurados`) y se muestra tal cual.
 */
export class HolidaysNotConfiguredError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
