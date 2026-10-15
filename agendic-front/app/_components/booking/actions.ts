'use server';

import { unstable_rethrow } from 'next/navigation';
import { getInjection } from '@/di/container';
import type { DI_RETURN_TYPES } from '@/di/types';
import {
    InvalidVerificationCodeError,
    SeriesDatesUnavailableError,
    SeriesTooShortError,
    SlotTakenError,
    SlotUnavailableError,
    TooManyVerificationCodeRequestsError,
} from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { WaitlistDateInPastError, WaitlistDayNotFullError } from '@/src/entities/errors/waitlist';

// Reservar no pide Sesión (ADR 0005): ninguna de las dos acciones manda a Iniciar sesión.

export type ListSlotsResult =
    | ({ ok: true } & Awaited<ReturnType<DI_RETURN_TYPES['IListSlotsController']>>)
    | { ok: false; message: string };

export async function listSlotsAction(query: {
    serviceId: number;
    from: string;
    to: string;
    employeeId?: number;
}): Promise<ListSlotsResult> {
    try {
        return { ok: true, ...(await getInjection('IListSlotsController')(query)) };
    } catch (error) {
        unstable_rethrow(error);
        // El Servicio se dio de baja desde que se cargó la página.
        if (error instanceof NotFoundError)
            return { ok: false, message: 'Este servicio ya no está disponible. Recargá la página.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos cargar los horarios. Intentá de nuevo.' };
    }
}

/**
 * El resultado de Reservar. `seriesConflict` son las fechas del 409 de una Serie (ADR 0007): el Cliente vuelve al paso
 * Fechas con ellas marcadas y reintenta con el mismo Código de verificación.
 */
export type BookSlotResult =
    | { ok: true; booking: Awaited<ReturnType<DI_RETURN_TYPES['IBookSlotController']>> }
    | { ok: false; slotTaken: boolean; invalidCode: boolean; seriesConflict?: string[]; message: string };

export async function bookSlotAction(
    payload: Parameters<DI_RETURN_TYPES['IBookSlotController']>[0],
): Promise<BookSlotResult> {
    try {
        const booking = await getInjection('IBookSlotController')(payload);
        return { ok: true, booking };
    } catch (error) {
        unstable_rethrow(error);
        // Esperable: alguna fecha de la Serie se ocupó; el Cliente sigue sin ella con el mismo código. No se reporta.
        if (error instanceof SeriesDatesUnavailableError)
            return {
                ok: false,
                slotTaken: false,
                invalidCode: false,
                seriesConflict: error.dates,
                message: 'Algunas fechas de la Serie ya no están disponibles.',
            };
        if (error instanceof SeriesTooShortError)
            return { ok: false, slotTaken: true, invalidCode: false, message: 'Una Serie necesita al menos 2 Turnos. Elegí otro horario.' };
        // Esperable, no un bug: alguien tomó el horario mientras tanto. No se reporta.
        if (error instanceof SlotTakenError)
            return { ok: false, slotTaken: true, invalidCode: false, message: 'Ese horario se acaba de ocupar. Elegí otro.' };
        // También esperable: el horario dejó de ser reservable (Anticipación mínima, Intervalo).
        if (error instanceof SlotUnavailableError)
            return { ok: false, slotTaken: true, invalidCode: false, message: 'Ese horario ya no está disponible. Elegí otro.' };
        // El Código de verificación no es válido o venció (ADR 0022): se pide uno nuevo, sin perder el horario.
        if (error instanceof InvalidVerificationCodeError)
            return { ok: false, slotTaken: false, invalidCode: true, message: 'El código no es válido o venció.' };
        if (error instanceof NotFoundError)
            return { ok: false, slotTaken: false, invalidCode: false, message: 'Este servicio ya no está disponible. Recargá la página.' };
        if (error instanceof InputParseError)
            return { ok: false, slotTaken: false, invalidCode: false, message: 'Revisá tus datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, slotTaken: false, invalidCode: false, message: 'No pudimos reservar tu turno. Intentá de nuevo.' };
    }
}

/** Las fechas de una Serie para el paso Fechas; `slotTaken` manda de vuelta a Horario porque el primer horario se ocupó. */
export type ListSeriesSlotsResult =
    | ({ ok: true } & Awaited<ReturnType<DI_RETURN_TYPES['IListSeriesSlotsController']>>)
    | { ok: false; slotTaken: boolean; message: string };

/** Las fechas de una Serie desde el horario elegido (ADR 0007). No pide Sesión (ADR 0005). */
export async function listSeriesSlotsAction(
    query: Parameters<DI_RETURN_TYPES['IListSeriesSlotsController']>[0],
): Promise<ListSeriesSlotsResult> {
    try {
        return { ok: true, ...(await getInjection('IListSeriesSlotsController')(query)) };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof SlotUnavailableError || error instanceof SlotTakenError)
            return { ok: false, slotTaken: true, message: 'Ese horario ya no está disponible. Elegí otro.' };
        if (error instanceof NotFoundError)
            return { ok: false, slotTaken: false, message: 'Este servicio ya no está disponible. Recargá la página.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, slotTaken: false, message: 'No pudimos cargar las fechas de la Serie. Intentá de nuevo.' };
    }
}

export type RequestVerificationCodeResult = { ok: true } | { ok: false; message: string };

export async function requestVerificationCodeAction(email: string): Promise<RequestVerificationCodeResult> {
    try {
        await getInjection('IRequestVerificationCodeController')({ email });
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error);
        // Esperable, no un bug: se pidieron demasiados códigos para ese email.
        if (error instanceof TooManyVerificationCodeRequestsError)
            return { ok: false, message: 'Pediste demasiados códigos. Esperá unos minutos e intentá de nuevo.' };
        if (error instanceof InputParseError) return { ok: false, message: 'Revisá tu email e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos enviar el código. Intentá de nuevo.' };
    }
}

export type JoinWaitlistResult =
    | { ok: true; entry: Awaited<ReturnType<DI_RETURN_TYPES['IJoinWaitlistController']>> }
    | { ok: false; invalidCode: boolean; dayChanged: boolean; message: string };

/** Anotarse en la Lista de espera. No pide Sesión (ADR 0005). */
export async function joinWaitlistAction(payload: Parameters<DI_RETURN_TYPES['IJoinWaitlistController']>[0]): Promise<JoinWaitlistResult> {
    try {
        const entry = await getInjection('IJoinWaitlistController')(payload);
        return { ok: true, entry };
    } catch (error) {
        unstable_rethrow(error);
        // El Código de verificación no es válido o venció: se pide uno nuevo, sin perder la fecha.
        if (error instanceof InvalidVerificationCodeError)
            return { ok: false, invalidCode: true, dayChanged: false, message: 'El código no es válido o venció.' };
        // Esperable, no un bug: el día se liberó mientras tanto, y se vuelve a los horarios para Reservar.
        if (error instanceof WaitlistDayNotFullError)
            return { ok: false, invalidCode: false, dayChanged: true, message: 'Ya hay horarios este día. Elegí uno para reservar.' };
        if (error instanceof WaitlistDateInPastError)
            return { ok: false, invalidCode: false, dayChanged: true, message: 'Esa fecha ya pasó. Elegí otro día.' };
        if (error instanceof NotFoundError)
            return { ok: false, invalidCode: false, dayChanged: false, message: 'Este servicio ya no está disponible. Recargá la página.' };
        if (error instanceof InputParseError)
            return { ok: false, invalidCode: false, dayChanged: false, message: 'Revisá tus datos e intentá de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, invalidCode: false, dayChanged: false, message: 'No pudimos anotarte. Intentá de nuevo.' };
    }
}
