'use server';

import { unstable_rethrow } from 'next/navigation';
import { getInjection } from '@/di/container';
import { BookingStateError, SlotTakenError } from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { invalidLink, type VerifyBookingResult } from './messages';

/**
 * Verifica el email del Cliente con el token del link del mail y devuelve el mensaje a mostrarle.
 *
 * Se dispara desde un botón y no al renderizar la página: un escáner de links del mail no debe consumir el token.
 * No pide Sesión (ADR 0005).
 */
export async function verifyBookingAction(token: string): Promise<VerifyBookingResult> {
    try {
        const booking = await getInjection('IVerifyBookingController')({ token });
        return booking.status === 'PENDING'
            ? { title: 'Email verificado', text: 'Tu turno quedó pendiente: el negocio tiene que aceptarlo.' }
            : { title: 'Email verificado', text: 'Verificamos tu email y tu turno quedó reservado.' };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof SlotTakenError)
            return { title: 'Ese horario se ocupó', text: 'Mientras tanto alguien tomó el horario. Reservá otro turno.' };
        if (error instanceof BookingStateError || error instanceof NotFoundError || error instanceof InputParseError)
            return invalidLink;
        getInjection('ICrashReporterService').report(error);
        return { title: 'No pudimos verificar tu email', text: 'Hubo un problema de nuestro lado. Probá de nuevo en unos segundos.' };
    }
}
