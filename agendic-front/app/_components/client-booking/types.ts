import type { DI_RETURN_TYPES } from '@/di/types';

/** Un Turno del Cliente, como lo presentan los tres endpoints del Enlace del Turno. */
export type ClientBooking = Awaited<ReturnType<DI_RETURN_TYPES['IGetBookingByLinkController']>>;

/**
 * Resultado de Cancelar, Reagendar, Pagar la Seña o marcar la Ausencia del Anfitrión como Cliente. `booking` es el Turno recargado cuando el fallo lo dejó desactualizado (el 409 al Calificar). `slotTaken` marca el 409 y el 422 de horario no disponible, que
 * se resuelven eligiendo otro horario. `field: 'reason'` pone el mensaje bajo el campo del Motivo de cancelación.
 */
export type ClientBookingActionResult =
    | { ok: true; booking: ClientBooking }
    | { ok: false; message: string; slotTaken?: true; booking?: ClientBooking; field?: 'reason' };
