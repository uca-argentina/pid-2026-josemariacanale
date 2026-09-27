'use server';

import { unstable_rethrow } from 'next/navigation';
import { getInjection } from '@/di/container';
import { SlotConflictError } from '@/src/entities/errors/booking';
import { InputParseError } from '@/src/entities/errors/common';
import type { Booking } from '@/src/entities/models/booking';
import type { ServiceSlots } from '@/src/entities/models/slot';

export type GetSlotsResult = { ok: true; slots: ServiceSlots } | { ok: false; message: string };

export async function getServiceSlotsAction(query: unknown): Promise<GetSlotsResult> {
    try {
        const slots = await getInjection('IGetServiceSlotsController')(query);
        return { ok: true, slots };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof InputParseError) {
            return { ok: false, message: 'Parámetros de consulta de disponibilidad inválidos' };
        }
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No se pudieron consultar los horarios disponibles.' };
    }
}

export type CreateBookingResult =
    | { ok: true; booking: Booking }
    | { ok: false; message: string; conflict?: boolean };

export async function createBookingAction(payload: unknown): Promise<CreateBookingResult> {
    try {
        const booking = await getInjection('ICreateBookingController')(payload);
        return { ok: true, booking };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof SlotConflictError) {
            return {
                ok: false,
                message: 'El horario seleccionado ya fue reservado. Por favor, elegí otro horario.',
                conflict: true,
            };
        }
        if (error instanceof InputParseError) {
            return { ok: false, message: 'Por favor, revisá los datos ingresados.' };
        }
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No se pudo completar la reserva. Intentá de nuevo más tarde.' };
    }
}

export type PayDepositResult =
    | { ok: true; booking: Booking }
    | { ok: false; message: string };

export async function payDepositAction(bookingId: number): Promise<PayDepositResult> {
    try {
        const booking = await getInjection('IPayDepositController')({ bookingId });
        return { ok: true, booking };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof InputParseError) {
            return { ok: false, message: 'ID de reserva inválido.' };
        }
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No se pudo procesar el pago de la seña. Intentá de nuevo más tarde.' };
    }
}

export type UpdateBookingStatusResult =
    | { ok: true; booking: Booking }
    | { ok: false; message: string };

export async function updateBookingStatusAction(payload: unknown): Promise<UpdateBookingStatusResult> {
    try {
        const booking = await getInjection('IUpdateBookingStatusController')(payload);
        return { ok: true, booking };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof InputParseError) {
            return { ok: false, message: 'Datos de actualización inválidos.' };
        }
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No se pudo actualizar el estado del turno.' };
    }
}
