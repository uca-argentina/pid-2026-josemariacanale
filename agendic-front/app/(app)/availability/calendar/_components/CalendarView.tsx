'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, CircleAlert, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { CALENDAR_PATH } from '@/app/routes';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from '@/app/_components/ui/alert-dialog';
import { Button } from '@/app/_components/ui/button';
import { CALENDAR_DISCONNECTED_NOTICE, CALENDAR_NOT_CONFIGURED_MESSAGE } from '@/app/(app)/_components/calendar-copy';
import { isCalendarDisconnected, type CalendarConnection, type CalendarReturn } from '@/src/entities/models/calendar-connection';
import { connectGoogleCalendarAction, disconnectCalendarAction } from '../actions';
import { CALENDAR_RETURN_MESSAGES } from '../calendar-return';

/**
 * La pantalla del Calendario conectado: conectar la cuenta de Google, ver cuál está conectada y desconectarla; con la
 * conexión `DISCONNECTED`, avisa que Google dejó de dar acceso y ofrece reconectar. `returned` es cómo volvió el Usuario
 * de Google: se muestra una vez y se saca de la URL.
 */
export function CalendarView({ connection, returned }: { connection: CalendarConnection | null; returned: CalendarReturn | null }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [notConfigured, setNotConfigured] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const announced = useRef(false);

    useEffect(() => {
        if (!returned || announced.current) return;
        announced.current = true;
        const { kind, message } = CALENDAR_RETURN_MESSAGES[returned];
        if (kind === 'success') toast.success(message);
        else toast.error(message);
        router.replace(CALENDAR_PATH);
    }, [returned, router]);

    const connect = async () => {
        setBusy(true);
        const result = await connectGoogleCalendarAction();
        if (result.ok) {
            // El navegador se va a Google: queda ocupado hasta que se descarga la página.
            window.location.assign(result.authorizationUrl);
            return;
        }
        setBusy(false);
        if (result.notConfigured) setNotConfigured(true);
        else toast.error(result.message);
    };

    const disconnect = async () => {
        setBusy(true);
        const result = await disconnectCalendarAction();
        setBusy(false);
        setConfirming(false);
        if (result.ok) toast.success('Desconectamos tu Google Calendar.');
        else toast.error(result.message);
    };

    const disconnected = isCalendarDisconnected(connection);

    return (
        <div className="flex-1 bg-background px-4 py-8 text-foreground sm:px-8">
            <header className="flex flex-col gap-1">
                <h1 className="m-0 text-xl font-extrabold tracking-tight">Calendario conectado</h1>
                <p className="m-0 text-sm text-muted-foreground">Conectá Google Calendar para que tus Turnos aparezcan en tu calendario.</p>
            </header>

            {disconnected && (
                <div role="alert" className="mt-6 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <p className="m-0 font-medium">{CALENDAR_DISCONNECTED_NOTICE}</p>
                </div>
            )}

            <div className="mt-6 flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:items-center">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <CalendarDays className="size-5" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                    {connection ? (
                        <>
                            <p className="m-0 text-sm font-bold">Google Calendar</p>
                            <p className="m-0 truncate text-sm text-muted-foreground">{connection.email}</p>
                        </>
                    ) : (
                        <>
                            <p className="m-0 text-sm font-bold">Ningún calendario conectado</p>
                            <p className="m-0 text-sm text-muted-foreground">Todavía no conectaste Google Calendar.</p>
                        </>
                    )}
                </div>
                {(!connection || disconnected) && (
                    <Button type="button" disabled={busy || notConfigured} onClick={connect}>
                        {disconnected ? 'Volver a conectar' : 'Conectar Google Calendar'}
                    </Button>
                )}
                {connection && (
                    <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirming(true)}>
                        <Unplug />
                        Desconectar
                    </Button>
                )}
            </div>

            {notConfigured && (
                <p role="status" className="mt-3 text-sm text-muted-foreground">
                    {CALENDAR_NOT_CONFIGURED_MESSAGE}
                </p>
            )}

            <AlertDialog open={confirming} onOpenChange={(open) => !busy && setConfirming(open)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogMedia className="rounded-full bg-destructive/10">
                            <CircleAlert className="text-destructive" />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Desconectar Google Calendar</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se borran los eventos futuros que Agendic escribió en tu calendario. Tus Turnos no se cancelan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction disabled={busy} onClick={disconnect}>
                            Desconectar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
