const THOUSANDS = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/** Un precio en pesos sin decimales, con el mismo formato que la página pública. */
export const formatPrice = (price: number) => `$${THOUSANDS.format(price)}`;

/** El aviso al terminar Dar de baja: cuántos Turnos futuros del Servicio quedaron cancelados. */
export const retiredMessage = (name: string, cancelledBookings: number) => {
    if (cancelledBookings === 0) return `${name}: dado de baja. No tenía Turnos por delante.`;
    if (cancelledBookings === 1) return `${name}: dado de baja. Se canceló 1 Turno.`;
    return `${name}: dado de baja. Se cancelaron ${cancelledBookings} Turnos.`;
};
