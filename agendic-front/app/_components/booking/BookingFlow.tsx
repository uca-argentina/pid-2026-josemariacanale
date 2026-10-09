'use client';

import { useEffect, useState, useTransition, ViewTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronRight, X } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';
import { Textarea } from '@/app/_components/ui/textarea';
import { cn } from '@/app/_components/utils';
import type { ServiceCategoryValue } from '@/app/_components/business-schemas';
import { bookingPath } from '@/app/routes';
import { BranchPhoto } from './BranchPhoto';
import { ChipTabs } from './ChipTabs';
import { CodeStep } from './CodeStep';
import { bookSlotAction, requestVerificationCodeAction } from './actions';
import type { BookSlotResult } from './actions';
import { TimeStep } from './TimeStep';
import { depositFor, endTime, formatDate, formatDuration, formatPrice } from './format';
import { STEPS } from './types';
import type { BookingDraft, ClientData, Host, Service, Step } from './types';

const TITLES: Record<Step, string> = {
    service: 'Elegí un servicio',
    time: 'Elegí día y horario',
    confirm: 'Revisá y confirmá',
};

const LABELS: Record<Step, string> = {
    service: 'Servicio',
    time: 'Horario',
    confirm: 'Confirmar',
};

const CLIENT_FORM = 'datos-del-cliente';

/** Cuánto se ve el "¡Listo!" antes de ir al Turno. */
const BOOKED_PAUSE_MS = 800;

function Breadcrumb({ step, locked, onGo }: { step: Step; locked: boolean; onGo: (s: Step) => void }) {
    const current = STEPS.indexOf(step);

    return (
        <nav aria-label="Pasos de la reserva">
            <ol className="flex flex-wrap items-center gap-1.5 text-[14px]">
                {STEPS.map((s, i) => {
                    const done = i < current;
                    return (
                        <li key={s} className="flex items-center gap-1.5">
                            {i > 0 && <ChevronRight className="size-4 text-muted-foreground" />}
                            <button
                                type="button"
                                onClick={() => done && onGo(s)}
                                disabled={!done || locked}
                                aria-current={i === current ? 'step' : undefined}
                                className={cn(
                                    'rounded-md px-1 tracking-[-0.01em] transition-colors',
                                    i === current && 'font-bold text-foreground',
                                    done && 'font-bold text-muted-foreground hover:text-foreground',
                                    i > current && 'font-medium text-muted-foreground',
                                )}
                            >
                                {LABELS[s]}
                            </button>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

function ServiceStep({
    services,
    categories,
    chosen,
    onChoose,
}: {
    services: Service[];
    categories: readonly { value: ServiceCategoryValue; label: string }[];
    chosen: Service | null;
    onChoose: (s: Service) => void;
}) {
    const [category, setCategory] = useState<ServiceCategoryValue>(
        chosen?.category ?? categories[0].value,
    );
    const shown = services.filter((s) => s.category === category);

    return (
        <>
            <ChipTabs
                options={categories}
                value={category}
                onSelect={setCategory}
                label="Categoría de servicio"
            />

            <div className="mt-6 flex flex-col gap-3">
                {shown.map((service) => {
                    const active = chosen?.id === service.id;
                    return (
                        <button
                            key={service.id}
                            type="button"
                            onClick={() => onChoose(service)}
                            aria-pressed={active}
                            className={cn(
                                'flex items-center gap-4 rounded-2xl border p-4.5 text-left transition-colors',
                                active
                                    ? 'border-foreground ring-1 ring-foreground'
                                    : 'border-border hover:border-foreground/40',
                            )}
                        >
                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="text-[15.5px] font-bold tracking-[-0.02em]">
                                    {service.name}
                                </span>
                                <span className="text-[13px] font-medium text-muted-foreground">
                                    {formatDuration(service.durationMinutes)}
                                </span>
                                {service.description && (
                                    <span className="mt-0.5 text-[13.5px] leading-relaxed text-muted-foreground">
                                        {service.description}
                                    </span>
                                )}
                                <span className="mt-1.5 flex flex-wrap items-baseline gap-2">
                                    <span className="text-[15px] font-extrabold tracking-[-0.025em]">
                                        {formatPrice(service.price)}
                                    </span>
                                    {!!service.depositPercent && (
                                        <span className="text-[12.5px] font-semibold text-muted-foreground">
                                            {service.depositPercent}% de seña
                                        </span>
                                    )}
                                </span>
                            </span>
                            <span
                                className={cn(
                                    'flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors',
                                    active
                                        ? 'border-foreground bg-foreground text-white'
                                        : 'border-border bg-muted text-muted-foreground',
                                )}
                            >
                                {active ? <Check className="size-4" /> : <span aria-hidden>+</span>}
                            </span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}

function ConfirmStep({
    host,
    service,
    defaults,
    error,
    onSubmitData,
}: {
    host: Host;
    service: Service;
    defaults: ClientData;
    error: string | null;
    onSubmitData: (data: ClientData) => void;
}) {
    const deposit = depositFor(service);

    return (
        <form
            id={CLIENT_FORM}
            onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                onSubmitData({
                    name: String(data.get('nombre')).trim(),
                    email: String(data.get('email')).trim(),
                    notes: String(data.get('comentario') ?? '').trim(),
                });
            }}
            className="flex max-w-[560px] flex-col gap-4"
        >
            <h3 className="text-[17px] font-extrabold tracking-[-0.02em]">Tus datos</h3>

            <div className="flex flex-col gap-2">
                <Label htmlFor="nombre" className="text-[13.5px] font-bold">
                    Nombre y apellido
                </Label>
                <Input
                    id="nombre"
                    name="nombre"
                    required
                    autoComplete="name"
                    placeholder="Tu nombre completo"
                    defaultValue={defaults.name}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-[13.5px] font-bold">
                    Email
                </Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="tunombre@email.com"
                    aria-describedby="email-ayuda"
                    defaultValue={defaults.email}
                />
                <p id="email-ayuda" className="text-[13px] leading-relaxed text-muted-foreground">
                    Te vamos a mandar un código para que verifiques tu email. Hasta que lo ingreses,
                    el horario no te queda reservado.
                </p>
            </div>

            {/* ponytail: la Seña es real (Service.depositPercent); la política de devolución es texto de maqueta. */}
            {deposit && (
                <section className="mt-2 flex flex-col gap-2 border-t border-border pt-5">
                    <h3 className="text-[17px] font-extrabold tracking-[-0.02em]">
                        Política de seña
                    </h3>
                    <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                        {host.name} pide una seña de {formatPrice(deposit.upfront)} (
                        {deposit.percent}% de {formatPrice(service.price)}) para sostener el turno.
                        El resto, {formatPrice(deposit.rest)}, lo pagás en el local.
                    </p>
                    <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                        Si cancelás con más de 24 horas de anticipación, la seña se devuelve. Si
                        reagendás, se traslada al nuevo turno.
                    </p>
                </section>
            )}

            <section className="mt-2 flex flex-col gap-2 border-t border-border pt-5">
                {/* El Comentario del Turno (Booking.notes): solo viaja si el Cliente escribió algo. */}
                <Label htmlFor="comentario" className="text-[17px] font-extrabold tracking-[-0.02em]">
                    Comentario para {host.name}
                </Label>
                <p className="text-[13.5px] text-muted-foreground">Opcional.</p>
                <Textarea
                    id="comentario"
                    name="comentario"
                    rows={4}
                    maxLength={500}
                    placeholder="Contanos algo que el profesional tenga que saber antes del turno."
                    defaultValue={defaults.notes}
                    className="mt-1 rounded-xl"
                />
            </section>

            {error && (
                <p role="alert" className="rounded-xl bg-muted p-4 text-[13.5px] font-semibold">
                    {error}
                </p>
            )}
        </form>
    );
}

/** El botón de avance. Va dos veces: en el panel lateral y en la barra fija de mobile. */
function AdvanceButton({
    step,
    canAdvance,
    pending,
    onAdvance,
    className,
}: {
    step: Step;
    canAdvance: boolean;
    /** Mientras se pide el Código de verificación: evita un segundo envío. */
    pending: boolean;
    onAdvance: () => void;
    className?: string;
}) {
    const last = step === 'confirm';
    const label = !last ? 'Continuar' : pending ? 'Reservando…' : 'Reservar';
    return (
        <Button
            type={last ? 'submit' : 'button'}
            form={last ? CLIENT_FORM : undefined}
            onClick={last ? undefined : onAdvance}
            disabled={!canAdvance || pending}
            className={cn(
                'h-auto w-full rounded-xl bg-foreground py-3.5 text-[15px] font-bold text-white hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100',
                className,
            )}
        >
            {label}
        </Button>
    );
}

function SummaryPanel({
    host,
    coverUrl,
    draft,
    step,
    codeOpen,
    canAdvance,
    pending,
    onAdvance,
}: {
    host: Host;
    coverUrl: string | undefined;
    draft: BookingDraft;
    step: Step;
    /** Con el paso del código no hay botón: reserva sola al completarse el código. */
    codeOpen: boolean;
    canAdvance: boolean;
    pending: boolean;
    onAdvance: () => void;
}) {
    const { service, date, slot } = draft;
    const deposit = service ? depositFor(service) : null;

    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-border p-5 lg:min-h-[560px]">
            <div className="flex items-center gap-3">
                <div className="relative size-[58px] shrink-0 overflow-hidden rounded-xl">
                    <BranchPhoto src={coverUrl} sizes="58px" />
                </div>
                <div className="min-w-0">
                    <h2 className="text-[15px] font-extrabold tracking-[-0.02em]">
                        {host.name}
                    </h2>
                    {host.branch && (
                        <p className="mt-0.5 text-[13px] text-muted-foreground">
                            {host.branch.name} · {host.branch.address}
                        </p>
                    )}
                </div>
            </div>

            {date && slot && service && (
                <dl className="flex flex-col gap-1.5 border-t border-border pt-4 text-[13.5px]">
                    <div className="flex gap-2">
                        <dt className="sr-only">Fecha</dt>
                        <dd className="font-bold first-letter:uppercase">{formatDate(date)}</dd>
                    </div>
                    <div className="flex gap-2">
                        <dt className="sr-only">Horario</dt>
                        <dd className="text-muted-foreground">
                            {slot.time} a {endTime(slot.time, service.durationMinutes)} (
                            {formatDuration(service.durationMinutes)})
                        </dd>
                    </div>
                </dl>
            )}

            <div className="border-t border-border pt-4">
                {service ? (
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[14px] font-bold tracking-[-0.02em]">
                                {service.name}
                            </p>
                            <p className="mt-0.5 text-[13px] text-muted-foreground">
                                {formatDuration(service.durationMinutes)}
                            </p>
                        </div>
                        <span className="shrink-0 text-[14px] font-bold">
                            {formatPrice(service.price)}
                        </span>
                    </div>
                ) : (
                    <p className="text-[13.5px] text-muted-foreground">
                        Todavía no elegiste un servicio.
                    </p>
                )}
            </div>

            <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                    <span className="text-[15px] font-extrabold tracking-[-0.02em]">Total</span>
                    <span className="text-[15px] font-extrabold tracking-[-0.02em]">
                        {service ? formatPrice(service.price) : '-'}
                    </span>
                </div>

                {step === 'confirm' && deposit && (
                    <dl className="mt-2.5 flex flex-col gap-1.5 text-[13.5px]">
                        <div className="flex items-center justify-between">
                            <dt className="font-bold">Seña ahora</dt>
                            <dd className="font-bold">{formatPrice(deposit.upfront)}</dd>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                            <dt>Resta en el local</dt>
                            <dd>{formatPrice(deposit.rest)}</dd>
                        </div>
                    </dl>
                )}
            </div>

            {!codeOpen && (
                <AdvanceButton
                    step={step}
                    canAdvance={canAdvance}
                    pending={pending}
                    onAdvance={onAdvance}
                    className="mt-auto hidden lg:inline-flex"
                />
            )}
        </div>
    );
}

export function BookingFlow({
    host,
    services,
    categories,
    coverUrl,
    initialService,
    onClose,
}: {
    host: Host;
    services: Service[];
    categories: readonly { value: ServiceCategoryValue; label: string }[];
    coverUrl: string | undefined;
    initialService: Service | null;
    onClose: () => void;
}) {
    const router = useRouter();
    const [step, setStep] = useState<Step>(initialService ? 'time' : 'service');
    const [draft, setDraft] = useState<BookingDraft>({
        service: initialService,
        date: null,
        slot: null,
    });
    const [client, setClient] = useState<ClientData>({ name: '', email: '', notes: '' });
    /** El 409 de horario ocupado: se muestra en el paso Horario, que es donde se resuelve. */
    const [slotNotice, setSlotNotice] = useState<string | null>(null);
    const [confirmError, setConfirmError] = useState<string | null>(null);
    /** Pedido el Código de verificación para `client.email`, el paso Confirmar lo pide en vez del formulario (ADR 0022). */
    const [codeOpen, setCodeOpen] = useState(false);
    /**
     * Desde que viaja el código hasta que se navega al Turno, nadie sale del flujo: el Turno puede estar creándose, y
     * quien cierre ahí se queda sin llegar a su Enlace del Turno.
     */
    const [codePhase, setCodePhase] = useState<'idle' | 'verifying' | 'booked'>('idle');
    const locked = codePhase !== 'idle';
    const [pending, startTransition] = useTransition();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !locked) onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose, locked]);

    const { service, date, slot } = draft;

    // Volver a elegir lo mismo no puede borrar lo que ya se eligió después: solo un cambio real
    // invalida los pasos siguientes.
    const chooseService = (next: Service) =>
        setDraft((d) =>
            d.service?.id === next.id
                ? d
                : { service: next, date: null, slot: null },
        );

    const canAdvance =
        (step === 'service' && !!service) ||
        (step === 'time' && !!date && !!slot) ||
        step === 'confirm';

    // Los avisos son del paso en que aparecieron: al cambiar de paso ya no dicen nada.
    const goTo = (next: Step) => {
        setSlotNotice(null);
        setConfirmError(null);
        setCodeOpen(false);
        setStep(next);
    };

    const advance = () => {
        const next = STEPS[STEPS.indexOf(step) + 1];
        if (!next) return;
        goTo(next);
    };

    /** Vuelve al formulario, en una transición para que el paso del código y el formulario se crucen. */
    const closeCode = () => startTransition(() => setCodeOpen(false));

    const back = () => {
        if (codeOpen) return closeCode();
        const previous = STEPS[STEPS.indexOf(step) - 1];
        if (previous) goTo(previous);
        else onClose();
    };

    // "Reservar": con los datos del Cliente, pide el Código de verificación para su email y pasa a pedirlo (ADR 0022).
    const requestCode = (data: ClientData) => {
        setClient(data);
        setConfirmError(null);
        startTransition(async () => {
            const result = await requestVerificationCodeAction(data.email);
            // Pasado el await, el set ya no es parte de la transición si no se lo vuelve a envolver.
            if (result.ok) startTransition(() => setCodeOpen(true));
            else setConfirmError(result.message);
        });
    };

    /**
     * Crea el Turno con el código ya completo.
     *
     * @returns el mensaje a mostrar en el paso del código si el código no sirvió; `null` si reservó, o si lo que
     * falló se resuelve afuera de ese paso y por eso lo cierra.
     */
    const book = async (code: string): Promise<string | null> => {
        if (!service || !date || !slot) return null;
        setCodePhase('verifying');
        const result = await bookSlotAction({
            serviceId: service.id,
            startsAt: slot.startsAt,
            clientName: client.name,
            clientEmail: client.email,
            notes: client.notes,
            code,
        }).catch(
            // La acción no respondió (sin red): sin esto la reserva quedaría bloqueada, sin forma de salir.
            (): BookSlotResult => ({ ok: false, slotTaken: false, invalidCode: false, message: 'No pudimos reservar tu turno. Intentá de nuevo.' }),
        );
        if (result.ok) {
            // En una transición para que las casillas se fundan en el "¡Listo!".
            startTransition(() => setCodePhase('booked'));
            // El código recién se validó, así que el back siempre devuelve el Enlace del Turno (ADR 0022). replace: el
            // botón Atrás del navegador no tiene que volver al código. `booked` le da su fundido a la página del Turno.
            const link = result.booking.link!;
            setTimeout(() => router.replace(bookingPath(link), { transitionTypes: ['booked'] }), BOOKED_PAUSE_MS);
            return null;
        }
        setCodePhase('idle');
        if (result.invalidCode) return result.message;
        if (result.slotTaken) {
            // Recuperable: de vuelta a Horario, que vuelve a pedir los horarios libres.
            startTransition(() => {
                setDraft((d) => ({ ...d, slot: null }));
                setSlotNotice(result.message);
                setCodeOpen(false);
                setStep('time');
            });
            return null;
        }
        startTransition(() => {
            setConfirmError(result.message);
            setCodeOpen(false);
        });
        return null;
    };

    // "Pedir un código nuevo", desde el paso del código: mismo pedido, con el email ya cargado.
    const requestNewCode = async () => {
        const result = await requestVerificationCodeAction(client.email);
        return result.ok ? null : result.message;
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Reservar un turno"
            className="fixed inset-0 z-50 overflow-y-auto bg-background"
        >
            <div className="flex items-center justify-between px-4 py-4 sm:px-8 lg:px-16">
                <Button
                    variant="ghost"
                    size="icon-lg"
                    onClick={back}
                    disabled={locked}
                    aria-label="Volver"
                    className="rounded-full"
                >
                    <ArrowLeft className="size-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon-lg"
                    onClick={onClose}
                    disabled={locked}
                    aria-label="Cerrar"
                    className="rounded-full"
                >
                    <X className="size-5" />
                </Button>
            </div>

            {/* pb-32 en mobile deja aire para la barra fija de abajo. */}
            <div className="mx-auto w-full max-w-[1400px] px-4 pb-32 sm:px-8 lg:px-16 lg:pb-24">
                <div className="grid items-start gap-10 lg:grid-cols-[1fr_400px]">
                    <div>
                        <Breadcrumb step={step} locked={locked} onGo={goTo} />
                        {/* La key cruza el formulario con el paso del código: uno sale y el otro entra. */}
                        <ViewTransition key={codeOpen ? 'code' : 'steps'} enter="step-in" exit="step-out" default="none">
                            <div>
                                <h1 className="mt-4 mb-6 text-[34px] leading-none font-extrabold tracking-[-0.03em] sm:text-[44px]">
                                    {codeOpen ? 'Verificá tu email' : TITLES[step]}
                                </h1>

                                {codeOpen ? (
                                    <CodeStep
                                        email={client.email}
                                        booked={codePhase === 'booked'}
                                        onSubmit={book}
                                        onRequestNewCode={requestNewCode}
                                        onChangeEmail={closeCode}
                                    />
                                ) : (
                                    <>
                                        {step === 'service' && (
                                            <ServiceStep
                                                services={services}
                                                categories={categories}
                                                chosen={service}
                                                onChoose={chooseService}
                                            />
                                        )}

                                        {step === 'time' && service && (
                                            <TimeStep
                                                key={service.id}
                                                service={service}
                                                date={date}
                                                slot={slot}
                                                notice={slotNotice}
                                                onSelect={(nextDate, nextSlot) =>
                                                    setDraft((d) => ({ ...d, date: nextDate, slot: nextSlot }))
                                                }
                                            />
                                        )}

                                        {step === 'confirm' && service && (
                                            <ConfirmStep
                                                host={host}
                                                service={service}
                                                defaults={client}
                                                error={confirmError}
                                                onSubmitData={requestCode}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </ViewTransition>
                    </div>

                    <aside className="hidden lg:sticky lg:top-6 lg:block">
                        <SummaryPanel
                            host={host}
                            coverUrl={coverUrl}
                            draft={draft}
                            step={step}
                            codeOpen={codeOpen}
                            canAdvance={canAdvance}
                            pending={pending}
                            onAdvance={advance}
                        />
                    </aside>
                </div>
            </div>

            {/* Abajo de lg el panel no entra al lado, así que el resumen queda en una barra fija. Con el paso del
                código no hace falta: no hay botón que tocar. */}
            {!codeOpen && (
                <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background px-4 py-3 shadow-[0_-1px_2px_rgba(15,27,45,0.06)] sm:px-8 lg:hidden">
                    <div className="mb-2 flex items-baseline justify-between gap-4">
                        <span className="min-w-0 truncate text-[13px] font-medium text-muted-foreground">
                            {service
                                ? service.name
                                : 'Todavía no elegiste un servicio.'}
                        </span>
                        <span className="shrink-0 text-[15px] font-extrabold tracking-[-0.02em]">
                            {service ? formatPrice(service.price) : '-'}
                        </span>
                    </div>
                    {step === 'confirm' && service && depositFor(service) && (
                        <p className="mb-2 text-[12.5px] text-muted-foreground">
                            Seña ahora {formatPrice(depositFor(service)!.upfront)} · resta{' '}
                            {formatPrice(depositFor(service)!.rest)} en el local
                        </p>
                    )}
                    <AdvanceButton step={step} canAdvance={canAdvance} pending={pending} onAdvance={advance} />
                </div>
            )}
        </div>
    );
}
