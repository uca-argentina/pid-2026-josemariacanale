import type { DI_RETURN_TYPES } from '@/di/types';

/** Un Turno del Cliente, como lo presentan los tres endpoints del Enlace del Turno. */
export type ClientBooking = Awaited<ReturnType<DI_RETURN_TYPES['IGetBookingByLinkController']>>;

/**
 * Resultado de Cancelar o Reagendar como Cliente. `slotTaken` marca el 409 y el 422 de horario no disponible, que
 * se resuelven eligiendo otro horario.
 */
export type ClientBookingActionResult =
    | { ok: true; booking: ClientBooking }
    | { ok: false; message: string; slotTaken?: true };
