// 409: the requested time slot overlaps an already booked Turno for this Empleado.
export class SlotConflictError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
