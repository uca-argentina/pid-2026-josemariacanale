import { unstable_rethrow } from 'next/navigation';
import { getInjection } from '@/di/container';
import { BookingStateError, SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import type { ClientBooking, ClientBookingActionResult } from './types';

/**
 * Corre Cancelar o Reagendar del Cliente y traduce sus errores a los mensajes que ve; los errores no esperados se
 * reportan y quedan como `unexpected`.
 */
export async function performClientBookingAction(
    run: () => Promise<ClientBooking>,
    unexpected: string,
): Promise<ClientBookingActionResult> {
    try {
        return { ok: true, booking: await run() };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof SlotTakenError) return { ok: false, slotTaken: true, message: 'Ese horario se acaba de ocupar. Elegí otro.' };
        if (error instanceof SlotUnavailableError) return { ok: false, slotTaken: true, message: 'Ese horario ya no está disponible. Elegí otro.' };
        if (error instanceof NotFoundError) return { ok: false, message: 'Este turno ya no existe.' };
        if (error instanceof BookingStateError) return { ok: false, message: 'El turno ya no se puede cambiar.' };
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: unexpected };
    }
}
