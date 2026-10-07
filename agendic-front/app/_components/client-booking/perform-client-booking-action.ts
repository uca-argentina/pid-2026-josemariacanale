import { unstable_rethrow } from 'next/navigation';
import { getInjection } from '@/di/container';
import { BookingStateError, ClientAccessExpiredError, SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import type { ClientBooking, ClientBookingActionResult } from './types';

/**
 * Corre Cancelar o Reagendar del Cliente y traduce sus errores a los mensajes que ve. Lo comparten Mis turnos y
 * el Enlace del Turno, así los dos muestran los mismos mensajes; los errores no esperados se reportan y quedan
 * como `unexpected`.
 */
export async function performClientBookingAction(
    run: () => Promise<ClientBooking>,
    unexpected: string,
): Promise<ClientBookingActionResult> {
    try {
        return { ok: true, booking: await run() };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof ClientAccessExpiredError) return { ok: false, expired: true, message: 'Tu acceso venció. Pedí un código nuevo.' };
        if (error instanceof SlotTakenError) return { ok: false, expired: false, slotTaken: true, message: 'Ese horario se acaba de ocupar. Elegí otro.' };
        if (error instanceof SlotUnavailableError)
            return { ok: false, expired: false, slotTaken: true, message: 'Ese horario ya no está disponible. Elegí otro.' };
        if (error instanceof NotFoundError) return { ok: false, expired: false, message: 'Este turno ya no existe.' };
        if (error instanceof BookingStateError) return { ok: false, expired: false, message: 'El turno ya no se puede cambiar.' };
        if (error instanceof InputParseError) return { ok: false, expired: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, expired: false, message: unexpected };
    }
}
