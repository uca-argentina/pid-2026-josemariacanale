'use server';

import { unstable_rethrow } from 'next/navigation';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

export type LeaveWaitlistResult = { ok: true } | { ok: false; message: string };

export async function leaveWaitlistAction(link: string): Promise<LeaveWaitlistResult> {
    try {
        await getInjection('ILeaveWaitlistController')({ link });
        return { ok: true };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof NotFoundError || error instanceof InputParseError) return { ok: false, message: 'Esta Anotación ya no existe.' };
        getInjection('ICrashReporterService').report(error);
        return { ok: false, message: 'No pudimos sacarte de la Lista de espera. Intentá de nuevo.' };
    }
}

// Lista de espera implementada
