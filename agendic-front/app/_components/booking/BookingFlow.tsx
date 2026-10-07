'use client';

import { useEffect, useState, useTransition } from 'react';
import { ArrowLeft, Check, ChevronRight, X } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';
import { Textarea } from '@/app/_components/ui/textarea';
import { cn } from '@/app/_components/utils';
import type { ServiceCategoryValue } from '@/app/_components/business-schemas';
import { BranchPhoto } from './BranchPhoto';
import { ChipTabs } from './ChipTabs';
import { bookSlotAction, requestVerificationCodeAction } from './actions';
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

function Breadcrumb({ step, onGo }: { step: Step; onGo: (s: Step) => void }) {
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
                                disabled={!done}
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
    codeStep,
    error,
    codeError,
    onSubmitData,
    onSubmitCode,
    onRequestNewCode,
}: {
    host: Host;
    service: Service;
    defaults: ClientData;
    /** Pedido el Código de verificación, se muestra el campo para ingresarlo en vez de los datos (ADR 0022). */
    codeStep: boolean;
    error: string | null;
    codeError: string | null;
    onSubmitData: (data: ClientData) => void;
    onSubmitCode: (code: string) => void;
    onRequestNewCode: () => void;
}) {
    const deposit = depositFor(service);

    if (codeStep)
        return (
            <form
                id={CLIENT_FORM}
                onSubmit={(e) => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    onSubmitCode(String(data.get('codigo') ?? '').trim());
                }}
                className="flex max-w-[560px] flex-col gap-4"
            >
                <h3 className="text-[17px] font-extrabold tracking-[-0.02em]">Verificá tu email</h3>
                <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                    Te mandamos un código a{' '}
                    <strong className="font-bold text-foreground">{defaults.email}</strong>. Ingresalo
                    para confirmar tu turno.
                </p>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="codigo" className="text-[13.5px] font-bold">
                        Código de verificación
                    </Label>
                    <Input
                        id="codigo"
                        name="codigo"
                        required
                        autoComplete="one-time-code"
                        inputMode="text"
                        placeholder="Código de 6 caracteres"
                    />
                </div>

                {codeError && (
                    <p role="alert" className="rounded-xl bg-muted p-4 text-[13.5px] font-semibold">
                        {codeError}
                    </p>
                )}

                <button
                    type="button"
                    onClick={onRequestNewCode}
                    className="self-start text-[13.5px] font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                    Pedir un código nuevo
                </button>
            </form>
        );

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
    codeStep,
    pending,
    onAdvance,
    className,
}: {
    step: Step;
    canAdvance: boolean;
    /** En Revisá y confirmá: ya se pidió el Código de verificación, falta ingresarlo. */
    codeStep: boolean;
    /** Mientras se pide el código o se crea el Turno: evita un segundo envío. */
    pending: boolean;
    onAdvance: () => void;
    className?: string;
}) {
    const last = step === 'confirm';
    const label = !last ? 'Continuar' : codeStep ? (pending ? 'Confirmando…' : 'Confirmar turno') : pending ? 'Enviando código…' : 'Enviar código';
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
    canAdvance,
    codeStep,
    pending,
    onAdvance,
}: {
    host: Host;
    coverUrl: string | undefined;
    draft: BookingDraft;
    step: Step;
    canAdvance: boolean;
    codeStep: boolean;
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

            <AdvanceButton
                step={step}
                canAdvance={canAdvance}
                codeStep={codeStep}
                pending={pending}
                onAdvance={onAdvance}
                className="mt-auto hidden lg:inline-flex"
            />
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
    onBooked,
}: {
    host: Host;
    services: Service[];
    categories: readonly { value: ServiceCategoryValue; label: string }[];
    coverUrl: string | undefined;
    initialService: Service | null;
    onClose: () => void;
    /** El acceso a Mis turnos recién abierto (ADR 0022): la página navega ahí con él. */
    onBooked: (access: string) => void;
}) {
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
    /** Pedido el Código de verificación para `client.email`, falta ingresarlo (ADR 0022). */
    const [codeStep, setCodeStep] = useState(false);
    const [codeError, setCodeError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

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
        setCodeError(null);
        setCodeStep(false);
        setStep(next);
    };

    const advance = () => {
        const next = STEPS[STEPS.indexOf(step) + 1];
        if (!next) return;
        goTo(next);
    };

    const back = () => {
        const previous = STEPS[STEPS.indexOf(step) - 1];
        if (previous) goTo(previous);
        else onClose();
    };

    // Paso 1: con los datos del Cliente, pide el Código de verificación para su email (ADR 0022).
    const requestCode = (data: ClientData) => {
        setClient(data);
        setConfirmError(null);
        startTransition(async () => {
            const result = await requestVerificationCodeAction(data.email);
            if (result.ok) setCodeStep(true);
            else setConfirmError(result.message);
        });
    };

    // Paso 2: con el código ya ingresado, crea el Turno.
    const confirmCode = (code: string) => {
        if (!service || !date || !slot) return;
        setCodeError(null);
        startTransition(async () => {
            const result = await bookSlotAction({
                serviceId: service.id,
                startsAt: slot.startsAt,
                clientName: client.name,
                clientEmail: client.email,
                notes: client.notes,
                code,
            });
            if (result.ok) {
                // El código recién se validó: el back siempre devuelve el acceso a Mis turnos (ADR 0022).
                onBooked(result.booking.access!);
            } else if (result.slotTaken) {
                // Recuperable: de vuelta a Horario, que vuelve a pedir los horarios libres.
                setDraft((d) => ({ ...d, slot: null }));
                setSlotNotice(result.message);
                setCodeStep(false);
                setStep('time');
            } else if (result.invalidCode) {
                setCodeError(result.message);
            } else {
                setConfirmError(result.message);
            }
        });
    };

    // "Pedir un código nuevo": mismo pedido, sin perder el paso en que está.
    const requestNewCode = () => {
        setCodeError(null);
        startTransition(async () => {
            const result = await requestVerificationCodeAction(client.email);
            if (!result.ok) setCodeError(result.message);
        });
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
                    aria-label="Volver"
                    className="rounded-full"
                >
                    <ArrowLeft className="size-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon-lg"
                    onClick={onClose}
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
                        <Breadcrumb step={step} onGo={goTo} />
                        <h1 className="mt-4 mb-6 text-[34px] leading-none font-extrabold tracking-[-0.03em] sm:text-[44px]">
                            {TITLES[step]}
                        </h1>

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
                                codeStep={codeStep}
                                error={confirmError}
                                codeError={codeError}
                                onSubmitData={requestCode}
                                onSubmitCode={confirmCode}
                                onRequestNewCode={requestNewCode}
                            />
                        )}
                    </div>

                    <aside className="hidden lg:sticky lg:top-6 lg:block">
                        <SummaryPanel
                            host={host}
                            coverUrl={coverUrl}
                            draft={draft}
                            step={step}
                            canAdvance={canAdvance}
                            codeStep={codeStep}
                            pending={pending}
                            onAdvance={advance}
                        />
                    </aside>
                </div>
            </div>

            {/* Abajo de lg el panel no entra al lado, así que el resumen queda en una barra fija. */}
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
                <AdvanceButton step={step} canAdvance={canAdvance} codeStep={codeStep} pending={pending} onAdvance={advance} />
            </div>
        </div>
    );
}
