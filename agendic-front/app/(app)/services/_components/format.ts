const THOUSANDS = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/** Un precio en pesos sin decimales, con el mismo formato que la página pública. */
export const formatPrice = (price: number) => `$${THOUSANDS.format(price)}`;

const cancelledText = (cancelledBookings: number, none: string) => {
    if (cancelledBookings === 0) return none;
    if (cancelledBookings === 1) return 'Se canceló 1 Turno.';
    return `Se cancelaron ${cancelledBookings} Turnos.`;
};

/** El aviso al terminar Dar de baja: cuántos Turnos futuros del Servicio quedaron cancelados. */
export const retiredMessage = (name: string, cancelledBookings: number) =>
    `${name}: dado de baja. ${cancelledText(cancelledBookings, 'No tenía Turnos por delante.')}`;

/**
 * El aviso al dejar de ofrecer un Servicio: cuántos Turnos futuros del Empleado en él quedaron cancelados.
 *
 * @param employeeName el Empleado que lo dejó, o null si es el propio Usuario
 */
export const stoppedOfferingMessage = (name: string, employeeName: string | null, cancelledBookings: number) =>
    employeeName === null
        ? `Dejaste de ofrecer ${name}. ${cancelledText(cancelledBookings, 'No tenías Turnos por delante.')}`
        : `${employeeName} dejó de ofrecer ${name}. ${cancelledText(cancelledBookings, 'No tenía Turnos por delante.')}`;
