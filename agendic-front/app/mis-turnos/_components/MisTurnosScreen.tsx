'use client';

import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/app/_components/ui/button';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';
import { ChipTabs } from '@/app/_components/booking/ChipTabs';
import { requestVerificationCodeAction } from '@/app/_components/booking/actions';
import { ClientBookingDetail } from '@/app/_components/client-booking/ClientBookingDetail';
import { STATUS_BADGE, hostName } from '@/app/_components/client-booking/client-booking-helpers';
import { formatLongDate, formatTime } from '@/app/_components/client-booking/format';
import type { ClientBooking } from '@/app/_components/client-booking/types';
import {
    cancelClientBookingAction,
    listClientBookingsAction,
    openClientAccessAction,
    rescheduleClientBookingAction,
} from '../actions';
import { sortForTab, tabOf, type Tab } from './mis-turnos-helpers';

const TABS = [
    { value: 'upcoming' as Tab, label: 'Próximos' },
    { value: 'past' as Tab, label: 'Historial' },
];

/** Lee `#acceso=<access>` del fragmento (nunca viaja al servidor) y lo borra de la URL. */
function readAccessFromHash(): string | null {
    const match = /^#acceso=(.+)$/.exec(window.location.hash);
    if (!match) return null;
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return decodeURIComponent(match[1]);
}

// El acceso vive adentro de `phase`, nunca en una variable aparte: así cada transición de pantalla
// es un solo setState, sin dos estados que puedan quedar desincronizados.
type Phase =
    | { step: 'gate' }
    | { step: 'loading'; access: string }
    | { step: 'error'; access: string; message: string }
    | { step: 'list'; access: string; bookings: ClientBooking[]; now: number };

/**
 * Mis turnos del Cliente (ADR 0022): pide email y Código de verificación, o toma el acceso ya
 * abierto del fragmento al volver de Reservar. El acceso vive solo en memoria, en este componente:
 * al recargar la página se pierde y se vuelve a pedir un código.
 */
export function MisTurnosScreen() {
    const [phase, setPhase] = useState<Phase>({ step: 'gate' });
    const [tab, setTab] = useState<Tab>('upcoming');
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const load = (access: string) => {
        listClientBookingsAction(access).then((result) => {
            if (result.ok) {
                // El de id más alto es el recién reservado: así llega elegido al volver de Reservar.
                setSelectedId((current) => current ?? (result.bookings.reduce((max, b) => Math.max(max, b.id), 0) || null));
                return setPhase({ step: 'list', access, bookings: result.bookings, now: Date.now() });
            }
            if (result.expired) return setPhase({ step: 'gate' });
            setPhase({ step: 'error', access, message: result.message });
        });
    };

    // Solo al montarse: el acceso que llega después es el que abre el Código de verificación.
    useEffect(() => {
        const access = readAccessFromHash();
        if (access) load(access);
    }, []);

    if (phase.step === 'gate')
        return (
            <CodeGate
                onAccess={(access) => {
                    setPhase({ step: 'loading', access });
                    load(access);
                }}
            />
        );
    if (phase.step === 'loading')
        return (
            <p role="status" className="mx-auto w-full max-w-[720px] px-4 py-16 text-center text-[14px] text-muted-foreground sm:px-8">
                Cargando tus turnos…
            </p>
        );
    if (phase.step === 'error')
        return (
            <div className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-3 px-4 py-16 text-center sm:px-8">
                <p role="alert" className="text-[14px] text-muted-foreground">
                    {phase.message}
                </p>
                <Button variant="outline" onClick={() => load(phase.access)}>
                    Reintentar
                </Button>
            </div>
        );

    const { access, now } = phase;
    const shown = sortForTab(tab, phase.bookings.filter((b) => tabOf(b, now) === tab));
    const selected = phase.bookings.find((b) => b.id === selectedId) ?? null;

    const replaceBooking = (updated: ClientBooking) =>
        setPhase({ ...phase, bookings: phase.bookings.map((b) => (b.id === updated.id ? updated : b)) });

    return (
        <div className="mx-auto grid w-full max-w-[1400px] flex-1 items-start gap-10 px-4 pt-6 pb-20 sm:px-8 lg:grid-cols-[360px_1fr] lg:px-16">
            <section aria-labelledby="turnos-titulo">
                <h1 id="turnos-titulo" className="text-[32px] leading-none font-extrabold tracking-[-0.03em]">
                    Mis turnos
                </h1>

                <div className="mt-5">
                    <ChipTabs options={TABS} value={tab} onSelect={setTab} label="Próximos o Historial" />
                </div>

                {shown.length === 0 ? (
                    <p className="mt-6 text-[14px] text-muted-foreground">
                        {tab === 'upcoming' ? 'No tenés turnos próximos.' : 'Todavía no tenés turnos en el historial.'}
                    </p>
                ) : (
                    <ul className="mt-3 flex flex-col gap-3">
                        {shown.map((b) => {
                            const active = b.id === selectedId;
                            const status = STATUS_BADGE[b.status];
                            return (
                                <li key={b.id}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedId(b.id)}
                                        aria-pressed={active}
                                        className={`flex w-full flex-col gap-1 rounded-2xl border p-4 text-left transition-colors ${
                                            active ? 'border-foreground ring-1 ring-foreground' : 'border-border hover:border-foreground/40'
                                        }`}
                                    >
                                        <p className="truncate text-[14.5px] font-bold tracking-[-0.02em]">{hostName(b)}</p>
                                        <p className="text-[13px] text-muted-foreground first-letter:uppercase">
                                            {formatLongDate(b.startsAt, b.timeZone)} a las {formatTime(b.startsAt, b.timeZone)}
                                        </p>
                                        <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] font-bold">
                                            <status.icon className="size-3.5" />
                                            {status.label}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {selected ? (
                // `key`: el aviso y los diálogos abiertos son de ese Turno; al elegir otro, arrancan de cero.
                <ClientBookingDetail
                    key={selected.id}
                    booking={selected}
                    now={now}
                    cancel={() => cancelClientBookingAction(access, selected.id)}
                    reschedule={(startsAt) => rescheduleClientBookingAction(access, selected.id, startsAt)}
                    onUpdated={replaceBooking}
                    onExpired={() => setPhase({ step: 'gate' })}
                />
            ) : (
                <section aria-label="Detalle del turno" className="rounded-2xl border border-border p-6">
                    <p className="text-[14.5px] text-muted-foreground">Elegí un turno para ver el detalle.</p>
                </section>
            )}
        </div>
    );
}

/** Email y Código de verificación: lo mismo que pide Reservar, acá para abrir el acceso a Mis turnos. */
function CodeGate({ onAccess }: { onAccess: (access: string) => void }) {
    const [email, setEmail] = useState('');
    const [codeStep, setCodeStep] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const requestCode = () => {
        setError(null);
        startTransition(async () => {
            const result = await requestVerificationCodeAction(email);
            if (result.ok) setCodeStep(true);
            else setError(result.message);
        });
    };

    const submitCode = (code: string) => {
        setError(null);
        startTransition(async () => {
            const result = await openClientAccessAction(email, code);
            if (result.ok) onAccess(result.access);
            else setError(result.message);
        });
    };

    return (
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-4 py-16 sm:px-8">
            <h1 className="text-[32px] leading-none font-extrabold tracking-[-0.03em]">Mis turnos</h1>
            <p className="mt-3 text-[14px] text-muted-foreground">
                {codeStep
                    ? `Te mandamos un código a ${email}. Ingresalo para ver tus turnos.`
                    : 'Ingresá tu email para ver y gestionar tus turnos.'}
            </p>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    if (!codeStep) requestCode();
                    else submitCode(String(data.get('codigo') ?? '').trim());
                }}
                className="mt-6 flex flex-col gap-4"
            >
                {!codeStep ? (
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="email" className="text-[13.5px] font-bold">
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="tunombre@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="codigo" className="text-[13.5px] font-bold">
                            Código de verificación
                        </Label>
                        <Input id="codigo" name="codigo" required autoComplete="one-time-code" placeholder="Código de 6 caracteres" />
                    </div>
                )}

                {error && (
                    <p role="alert" className="rounded-xl bg-muted p-4 text-[13.5px] font-semibold">
                        {error}
                    </p>
                )}

                {codeStep && (
                    <button
                        type="button"
                        onClick={requestCode}
                        className="self-start text-[13.5px] font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                        Pedir un código nuevo
                    </button>
                )}

                <Button
                    type="submit"
                    disabled={pending || (!codeStep && !email.trim())}
                    className="h-auto rounded-xl bg-foreground py-3.5 text-[15px] font-bold text-white hover:bg-foreground/90"
                >
                    {pending ? 'Enviando…' : codeStep ? 'Ver mis turnos' : 'Enviar código'}
                </Button>
            </form>
        </div>
    );
}
