import { unstable_rethrow } from 'next/navigation';
import { getInjection } from '@/di/container';
import { CANCELLATION_REASON_TOO_LONG } from '@/app/_components/cancellation-reason';
import { BookingStateError, CancellationReasonTooLongError, SlotTakenError, SlotUnavailableError } from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import type { ClientBooking, ClientBookingActionResult } from './types';

/**
 * Corre Cancelar, Reagendar o Pagar la Seña del Cliente y traduce sus errores a los mensajes que ve; los errores no esperados se
 * reportan y quedan como `unexpected`. `describeStateError` da un mensaje propio a un 422 según el mensaje del back; si no lo
 * reconoce, vale el genérico.
 */
export async function performClientBookingAction(
    run: () => Promise<ClientBooking>,
    unexpected: string,
    describeStateError?: (message: string) => string | undefined,
): Promise<ClientBookingActionResult> {
    try {
        return { ok: true, booking: await run() };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof CancellationReasonTooLongError) return { ok: false, field: 'reason', message: CANCELLATION_REASON_TOO_LONG };
        if (error instanceof SlotTakenError) return { ok: false, slotTaken: true, message: 'Ese horario se acaba de ocupar. Elegí otro.' };
        if (error instanceof SlotUnavailableError) return { ok: false, slotTaken: true, message: 'Ese horario ya no está disponible. Elegí otro.' };
        if (error instanceof NotFoundError) return { ok: false, message: 'Este turno ya no existe.' };
        if (error instanceof BookingStateError) return { ok: false, message: describeStateError?.(error.message) ?? 'El turno ya no se puede cambiar.' };
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá los datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: unexpected };
    }
}
