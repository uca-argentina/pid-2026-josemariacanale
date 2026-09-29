// 409: the Horario reservable was taken between showing it and confirming the Turno. Expected, not
// a bug: the Cliente picks another one.
export class SlotTakenError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
