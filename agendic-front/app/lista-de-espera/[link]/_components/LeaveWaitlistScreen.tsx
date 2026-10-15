'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formatDate } from '@/app/_components/booking/format';
import { Button } from '@/app/_components/ui/button';
import { bookOtherDayPath } from '@/app/routes';
import type { WaitlistEntryView } from '@/src/entities/models/waitlist';
import { leaveWaitlistAction } from '../../actions';

/**
 * Muestra la Anotación de un enlace de Salir de la Lista de espera. Abrir la página no saca a nadie: solo el botón
 * hace el POST, porque los antivirus del mail abren los enlaces solos. Una vez fuera, o si ya había salido, ofrece
 * Reservar otro día.
 */
export function LeaveWaitlistScreen({ link, entry }: { link: string; entry: WaitlistEntryView }) {
    const [left, setLeft] = useState(entry.left);
    const [error, setError] = useState<string>();
    const [pending, startTransition] = useTransition();
    const otherDay = bookOtherDayPath(entry);

    const leave = () =>
        startTransition(async () => {
            setError(undefined);
            const result = await leaveWaitlistAction(link);
            if (result.ok) setLeft(true);
            else setError(result.message);
        });

    return (
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-4 py-16 sm:px-8">
            {left ? (
                <>
                    <h1 className="text-[32px] leading-none font-extrabold tracking-[-0.03em]">Ya no estás en la Lista de espera</h1>
                    <p className="mt-3 text-[14px] text-muted-foreground">No te vamos a avisar más por {entry.service.name}.</p>
                    {otherDay && (
                        <Link
                            href={otherDay}
                            className="mt-6 self-start text-[14px] font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        >
                            Reservar otro día
                        </Link>
                    )}
                </>
            ) : (
                <>
                    <h1 className="text-[32px] leading-none font-extrabold tracking-[-0.03em]">Lista de espera</h1>
                    <p className="mt-3 text-[14px] text-muted-foreground">
                        Estás anotado en {entry.service.name}
                        {entry.business && entry.branch && ` de ${entry.business.name}, ${entry.branch.name}`}, para el{' '}
                        <span className="font-bold text-foreground">{formatDate(entry.date)}</span>. Si salís, no te vamos a avisar cuando se
                        libere un horario.
                    </p>
                    {error && (
                        <p role="alert" className="mt-4 text-[13px] font-bold text-destructive">
                            {error}
                        </p>
                    )}
                    <Button onClick={leave} disabled={pending} className="mt-6 self-start">
                        Salir de la Lista de espera
                    </Button>
                </>
            )}
        </div>
    );
}
