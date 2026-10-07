import type { DI_RETURN_TYPES } from '@/di/types';

/** Un Turno del Cliente como lo ven Mis turnos y el Enlace del Turno: los dos presenters devuelven la misma forma. */
export type ClientBooking = Awaited<ReturnType<DI_RETURN_TYPES['IGetBookingByLinkController']>>;

/**
 * Resultado de Cancelar o Reagendar como Cliente. `expired` marca el 401 del acceso a Mis turnos (el Enlace del
 * Turno no tiene acceso que venza); `slotTaken`, el 409 y el 422 de horario no disponible, que se resuelven
 * eligiendo otro horario.
 */
export type ClientBookingActionResult =
    | { ok: true; booking: ClientBooking }
    | { ok: false; expired: boolean; message: string; slotTaken?: true };
