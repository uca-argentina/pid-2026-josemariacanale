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
import {
    CALENDAR_PROVIDER_NAMES,
    calendarDisconnectedNotice,
    calendarNotConfiguredMessage,
    calendarsUnavailableMessage,
    otherCalendarProvider,
} from '@/app/(app)/_components/calendar-copy';
import {
    isCalendarDisconnected,
    type AccountCalendar,
    type CalendarConnection,
    type CalendarProvider,
    type CalendarReturn,
} from '@/src/entities/models/calendar-connection';
import { connectGoogleCalendarAction, connectMicrosoftCalendarAction, disconnectCalendarAction } from '../actions';
import { CALENDAR_RETURN_MESSAGES } from '../calendar-return';
import { CalendarsPicker } from './CalendarsPicker';
import { ProviderIcon } from './ProviderIcon';

const CONNECT_ACTIONS = { GOOGLE: connectGoogleCalendarAction, MICROSOFT: connectMicrosoftCalendarAction };

/**
 * La pantalla del Calendario conectado: conectar la cuenta de Google o la de Microsoft, ver cuál está conectada y
 * desconectarla; con la conexión `DISCONNECTED`, avisa que el proveedor dejó de dar acceso y ofrece reconectar el mismo o
 * conectar el otro. `returned` es cómo volvió el Usuario del proveedor: se muestra una vez y se saca de la URL. Con la
 * conexión `CONNECTED`, `calendars` son los de la cuenta para tildar cuáles cuentan como Ocupado externo;
 * `calendarsUnavailable` es que el proveedor no respondió al leerlos.
 */
export function CalendarView({
    connection,
    calendars,
    calendarsUnavailable,
    returned,
}: {
    connection: CalendarConnection | null;
    calendars: AccountCalendar[] | null;
    calendarsUnavailable: boolean;
    returned: CalendarReturn | null;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [notConfigured, setNotConfigured] = useState<CalendarProvider[]>([]);
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

    const connect = async (provider: CalendarProvider) => {
        setBusy(true);
        const result = await CONNECT_ACTIONS[provider]();
        if (result.ok) {
            // El navegador se va al proveedor: queda ocupado hasta que se descarga la página.
            window.location.assign(result.authorizationUrl);
            return;
        }
        setBusy(false);
        if (result.notConfigured) setNotConfigured((current) => (current.includes(provider) ? current : [...current, provider]));
        else toast.error(result.message);
    };

    const disconnect = async (provider: CalendarProvider) => {
        setBusy(true);
        const result = await disconnectCalendarAction();
        setBusy(false);
        setConfirming(false);
        if (result.ok) toast.success(`Desconectamos tu ${CALENDAR_PROVIDER_NAMES[provider]}.`);
        else toast.error(result.message);
    };

    const disconnected = isCalendarDisconnected(connection);
    // Sin conexión, los dos; con la conexión `DISCONNECTED`, el mismo proveedor primero y después el otro.
    const providers: CalendarProvider[] = !connection
        ? ['GOOGLE', 'MICROSOFT']
        : disconnected
          ? [connection.provider, otherCalendarProvider(connection.provider)]
          : [];

    return (
        <div className="flex-1 bg-background px-4 py-8 text-foreground sm:px-8">
            <header className="flex flex-col gap-1">
                <h1 className="m-0 text-xl font-extrabold tracking-tight">Calendario conectado</h1>
                <p className="m-0 text-sm text-muted-foreground">
                    Conectá Google Calendar o Microsoft Calendar (Outlook o Microsoft 365) para que tus Turnos aparezcan en tu calendario.
                </p>
            </header>

            {connection && disconnected && (
                <div role="alert" className="mt-6 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <p className="m-0 font-medium">{calendarDisconnectedNotice(connection.provider)}</p>
                </div>
            )}

            <div className="mt-6 flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:items-center">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    {connection ? <ProviderIcon provider={connection.provider} className="size-5" /> : <CalendarDays className="size-5" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                    {connection ? (
                        <>
                            <p className="m-0 text-sm font-bold">{CALENDAR_PROVIDER_NAMES[connection.provider]}</p>
                            <p className="m-0 truncate text-sm text-muted-foreground">{connection.email}</p>
                        </>
                    ) : (
                        <>
                            <p className="m-0 text-sm font-bold">Ningún calendario conectado</p>
                            <p className="m-0 text-sm text-muted-foreground">Todavía no conectaste Google Calendar ni Microsoft Calendar.</p>
                        </>
                    )}
                </div>
                {providers.map((provider) => (
                    <Button
                        key={provider}
                        type="button"
                        variant={connection && provider !== connection.provider ? 'outline' : 'default'}
                        disabled={busy || notConfigured.includes(provider)}
                        onClick={() => connect(provider)}
                    >
                        <ProviderIcon provider={provider} className="size-4" />
                        {connection && provider === connection.provider ? 'Volver a conectar' : `Conectar ${CALENDAR_PROVIDER_NAMES[provider]}`}
                    </Button>
                ))}
                {connection && (
                    <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirming(true)}>
                        <Unplug />
                        Desconectar
                    </Button>
                )}
            </div>

            {calendars && <CalendarsPicker key={JSON.stringify(calendars)} calendars={calendars} />}

            {calendarsUnavailable && connection && (
                <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 rounded-md border p-4 text-sm">
                    <p className="m-0 flex-1">{calendarsUnavailableMessage(connection.provider)}</p>
                    <Button type="button" variant="outline" onClick={() => router.refresh()}>
                        Reintentar
                    </Button>
                </div>
            )}

            {notConfigured.map((provider) => (
                <p key={provider} role="status" className="mt-3 text-sm text-muted-foreground">
                    {calendarNotConfiguredMessage(provider)}
                </p>
            ))}

            <AlertDialog open={confirming} onOpenChange={(open) => !busy && setConfirming(open)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogMedia className="rounded-full bg-destructive/10">
                            <CircleAlert className="text-destructive" />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Desconectar {connection ? CALENDAR_PROVIDER_NAMES[connection.provider] : 'el calendario'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se borran los eventos futuros que Agendic escribió en tu calendario. Tus Turnos no se cancelan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction disabled={busy} onClick={() => connection && disconnect(connection.provider)}>
                            Desconectar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
