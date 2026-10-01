import { unstable_rethrow } from 'next/navigation';
import { getInjection } from '@/di/container';
import { BookingStateError, SlotTakenError } from '@/src/entities/errors/booking';
import { InputParseError } from '@/src/entities/errors/common';

export const metadata = { title: 'Verificar email' };

async function verify(token: string | undefined) {
    try {
        const booking = await getInjection('IVerifyBookingController')({ token });
        return booking.status === 'PENDING'
            ? { title: 'Email verificado', text: 'Tu turno quedó pendiente: el negocio tiene que aceptarlo.' }
            : { title: 'Turno confirmado', text: 'Verificamos tu email y tu turno quedó reservado.' };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof SlotTakenError)
            return { title: 'Ese horario se ocupó', text: 'Mientras tanto alguien tomó el horario. Reservá otro turno.' };
        if (error instanceof BookingStateError || error instanceof InputParseError)
            return { title: 'Link inválido o vencido', text: 'El link ya se usó o venció. Reservá el turno de nuevo.' };
        getInjection('ICrashReporterService').report(error);
        return { title: 'No pudimos verificar tu email', text: 'Hubo un problema de nuestro lado. Probá de nuevo en unos segundos.' };
    }
}

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { title, text } = await verify((await searchParams).token);
    return (
        <main className="mx-auto flex max-w-[420px] flex-col items-center gap-2.5 px-7 py-15 text-center">
            <h1 className="text-[16px] font-extrabold tracking-[-0.02em]">{title}</h1>
            <p className="text-[13px] font-medium text-muted-foreground">{text}</p>
        </main>
    );
}
