'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/app/_components/ui/button';
import { verifyBookingAction } from '../actions';
import type { VerifyBookingResult } from '../messages';

const networkError: VerifyBookingResult = {
    title: 'No pudimos verificar tu email',
    text: 'No pudimos comunicarnos con Agendic. Revisá tu conexión e intentá de nuevo.',
};

/** Botón que verifica el Turno con el `token` del mail y, al terminar, reemplaza el pedido por el resultado. */
export function ConfirmBookingButton({ token }: { token: string }) {
    const [result, setResult] = useState<VerifyBookingResult>();
    const [pending, startTransition] = useTransition();

    if (result)
        return (
            <>
                <h1 className="text-[16px] font-extrabold tracking-[-0.02em]">{result.title}</h1>
                <p className="text-[13px] font-medium text-muted-foreground">{result.text}</p>
            </>
        );

    return (
        <>
            <h1 className="text-[16px] font-extrabold tracking-[-0.02em]">Confirmá tu Turno</h1>
            <p className="text-[13px] font-medium text-muted-foreground">Un último paso para dejar tu turno reservado.</p>
            <Button disabled={pending} onClick={() => startTransition(async () => setResult(await verifyBookingAction(token).catch(() => networkError)))}>
                Confirmar mi Turno
            </Button>
        </>
    );
}
