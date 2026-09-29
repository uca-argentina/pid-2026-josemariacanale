'use server';

import { unstable_rethrow } from 'next/navigation';
import { getInjection } from '@/di/container';
import type { DI_RETURN_TYPES } from '@/di/types';
import { SlotTakenError } from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

// Reservar no pide Sesión (ADR 0005): ninguna de las dos acciones manda a Iniciar sesión.

export type ListSlotsResult =
    | { ok: true; days: Awaited<ReturnType<DI_RETURN_TYPES['IListSlotsController']>>['days'] }
    | { ok: false; message: string };

export async function listSlotsAction(query: {
    serviceId: number;
    employeeId: number;
    from: string;
    to: string;
}): Promise<ListSlotsResult> {
    try {
        const { days } = await getInjection('IListSlotsController')(query);
        return { ok: true, days };
    } catch (error) {
        unstable_rethrow(error);
        // El Servicio se dio de baja o el Empleado dejó de atenderlo desde que se cargó la página.
        if (error instanceof NotFoundError)
            return { ok: false, message: 'Este profesional ya no atiende este servicio. Recargá la página.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos cargar los horarios. Intentá de nuevo.' };
    }
}

export type BookSlotResult =
    | { ok: true; booking: Awaited<ReturnType<DI_RETURN_TYPES['IBookSlotController']>> }
    | { ok: false; slotTaken: boolean; message: string };

export async function bookSlotAction(
    payload: Parameters<DI_RETURN_TYPES['IBookSlotController']>[0],
): Promise<BookSlotResult> {
    try {
        const booking = await getInjection('IBookSlotController')(payload);
        return { ok: true, booking };
    } catch (error) {
        unstable_rethrow(error);
        // Esperable, no un bug: alguien tomó el horario mientras tanto. No se reporta.
        if (error instanceof SlotTakenError)
            return { ok: false, slotTaken: true, message: 'Ese horario se acaba de ocupar. Elegí otro.' };
        if (error instanceof NotFoundError)
            return { ok: false, slotTaken: false, message: 'Este servicio ya no está disponible. Recargá la página.' };
        if (error instanceof InputParseError)
            return { ok: false, slotTaken: false, message: 'Revisá tus datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, slotTaken: false, message: 'No pudimos reservar tu turno. Intentá de nuevo.' };
    }
}
