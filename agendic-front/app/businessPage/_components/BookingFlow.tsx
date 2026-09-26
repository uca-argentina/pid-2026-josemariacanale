'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, Check, ChevronRight, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/app/_components/ui/avatar';
import { Button } from '@/app/_components/ui/button';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';
import { Textarea } from '@/app/_components/ui/textarea';
import { cn } from '@/app/_components/utils';
import type { ServiceCategoryValue } from '@/app/onboarding/_components/schemas';
import { ChipTabs } from './ChipTabs';
import { TimeStep } from './TimeStep';
import {
    availableDays,
    depositFor,
    endTime,
    formatDate,
    formatDuration,
    formatPrice,
    initials,
} from './mock-business';
import { STEPS } from './types';
import type { Booking, BookingDraft, Branch, Business, Employee, Service, Step } from './types';

const TITLES: Record<Step, string> = {
    service: 'Elegí un servicio',
    employee: 'Elegí profesional',
    time: 'Elegí día y horario',
    confirm: 'Revisá y confirmá',
};

// ponytail: el glosario (CONTEXT.md) dice Empleado; el panel ya rotula "Profesionales"
// ((app)/layout.tsx). Se sigue a la UI existente por consistencia, pero la divergencia con
// docs/agents/domain.md está sin resolver. El código sí usa el identificador `Employee`.
const LABELS: Record<Step, string> = {
    service: 'Servicio',
    employee: 'Profesional',
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
                                    {service.depositPercent && (
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

function EmployeeStep({
    service,
    chosen,
    onChoose,
}: {
    service: Service;
    chosen: Employee | null;
    onChoose: (e: Employee) => void;
}) {
    return (
        <>
            <p className="text-[14px] text-muted-foreground">
                Profesionales que atienden {service.name}.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {service.employees.map((employee) => {
                    const active = chosen?.id === employee.id;
                    return (
                        <button
                            key={employee.id}
                            type="button"
                            onClick={() => onChoose(employee)}
                            aria-pressed={active}
                            className={cn(
                                'flex flex-col items-center gap-3 rounded-2xl border px-4 py-6 transition-colors',
                                active
                                    ? 'border-foreground ring-1 ring-foreground'
                                    : 'border-border hover:border-foreground/40',
                            )}
                        >
                            <Avatar className="size-14">
                                <AvatarFallback className="bg-muted text-[15px] font-extrabold text-foreground">
                                    {initials(employee.name)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-[14px] font-bold tracking-[-0.02em]">
                                {employee.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}

function ConfirmStep({
    business,
    service,
    onSubmit,
}: {
    business: Business;
    service: Service;
    onSubmit: (data: { name: string; email: string; notes: string }) => void;
}) {
    const deposit = depositFor(service);

    return (
        <form
            id={CLIENT_FORM}
            onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                onSubmit({
                    name: String(data.get('nombre')).trim(),
                    email: String(data.get('email')).trim(),
                    notes: String(data.get('notas') ?? '').trim(),
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
                />
                <p id="email-ayuda" className="text-[13px] leading-relaxed text-muted-foreground">
                    Te mandamos un mail para que confirmes el turno. Hasta que lo confirmes, el
                    horario no te queda reservado.
                </p>
            </div>

            {/* ponytail: maqueta. La Seña no existe ni en el schema, ni en ADR 0007, ni en el glosario. */}
            {deposit && (
                <section className="mt-2 flex flex-col gap-2 border-t border-border pt-5">
                    <h3 className="text-[17px] font-extrabold tracking-[-0.02em]">
                        Política de seña
                    </h3>
                    <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                        {business.name} pide una seña de {formatPrice(deposit.upfront)} (
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
                {/* ponytail: maqueta. Booking no tiene campo de notas todavía. */}
                <Label htmlFor="notas" className="text-[17px] font-extrabold tracking-[-0.02em]">
                    Notas para el negocio
                </Label>
                <p className="text-[13.5px] text-muted-foreground">Opcional.</p>
                <Textarea
                    id="notas"
                    name="notas"
                    rows={4}
                    placeholder="Contanos algo que el profesional tenga que saber antes del turno."
                    className="mt-1 rounded-xl"
                />
            </section>
        </form>
    );
}

/** El botón de avance. Va dos veces: en el panel lateral y en la barra fija de mobile. */
function AdvanceButton({
    step,
    canAdvance,
    onAdvance,
    className,
}: {
    step: Step;
    canAdvance: boolean;
    onAdvance: () => void;
    className?: string;
}) {
    const last = step === 'confirm';
    return (
        <Button
            type={last ? 'submit' : 'button'}
            form={last ? CLIENT_FORM : undefined}
            onClick={last ? undefined : onAdvance}
            disabled={!canAdvance}
            className={cn(
                'h-auto w-full rounded-xl bg-foreground py-3.5 text-[15px] font-bold text-white hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100',
                className,
            )}
        >
            {last ? 'Confirmar turno' : 'Continuar'}
        </Button>
    );
}

function SummaryPanel({
    business,
    branch,
    photo,
    draft,
    step,
    canAdvance,
    onAdvance,
}: {
    business: Business;
    branch: Branch;
    photo: string;
    draft: BookingDraft;
    step: Step;
    canAdvance: boolean;
    onAdvance: () => void;
}) {
    const { service, employee, date, time } = draft;
    const deposit = service ? depositFor(service) : null;

    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-border p-5 lg:min-h-[560px]">
            <div className="flex items-center gap-3">
                <div className="relative size-[58px] shrink-0 overflow-hidden rounded-xl">
                    <Image src={photo} alt="" fill sizes="58px" className="object-cover" />
                </div>
                <div className="min-w-0">
                    <h2 className="text-[15px] font-extrabold tracking-[-0.02em]">
                        {business.name}
                    </h2>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {branch.name} · {branch.address}
                    </p>
                </div>
            </div>

            {date && time && service && (
                <dl className="flex flex-col gap-1.5 border-t border-border pt-4 text-[13.5px]">
                    <div className="flex gap-2">
                        <dt className="sr-only">Fecha</dt>
                        <dd className="font-bold first-letter:uppercase">{formatDate(date)}</dd>
                    </div>
                    <div className="flex gap-2">
                        <dt className="sr-only">Horario</dt>
                        <dd className="text-muted-foreground">
                            {time} a {endTime(time, service.durationMinutes)} (
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
                                {employee ? ` con ${employee.name}` : ''}
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
                onAdvance={onAdvance}
                className="mt-auto hidden lg:inline-flex"
            />
        </div>
    );
}

export function BookingFlow({
    business,
    branch,
    services,
    categories,
    photo,
    initialService,
    onClose,
    onBooked,
}: {
    business: Business;
    branch: Branch;
    services: Service[];
    categories: readonly { value: ServiceCategoryValue; label: string }[];
    photo: string;
    initialService: Service | null;
    onClose: () => void;
    onBooked: (booking: Booking) => void;
}) {
    const [step, setStep] = useState<Step>(initialService ? 'employee' : 'service');
    const [draft, setDraft] = useState<BookingDraft>({
        service: initialService,
        employee: null,
        date: null,
        time: null,
    });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const { service, employee, date, time } = draft;

    // Volver a elegir lo mismo no puede borrar lo que ya se eligió después: solo un cambio real
    // invalida los pasos siguientes.
    const chooseService = (next: Service) =>
        setDraft((d) =>
            d.service?.id === next.id
                ? d
                : { service: next, employee: null, date: null, time: null },
        );

    // Cada Empleado tiene su propia agenda, así que el horario elegido para otro no sirve.
    const chooseEmployee = (next: Employee) =>
        setDraft((d) =>
            d.employee?.id === next.id ? d : { ...d, employee: next, date: null, time: null },
        );

    const canAdvance =
        (step === 'service' && !!service) ||
        (step === 'employee' && !!employee) ||
        (step === 'time' && !!date && !!time) ||
        step === 'confirm';

    const advance = () => {
        const next = STEPS[STEPS.indexOf(step) + 1];
        if (!next) return;
        // Al entrar a Horario se abre el primer día, como la referencia: así se ve de entrada si
        // el profesional tiene lugar o tiene la agenda completa.
        if (next === 'time' && service && employee && !date) {
            const [first] = availableDays(service.durationMinutes, employee.id);
            setDraft((d) => ({ ...d, date: first.date, time: null }));
        }
        setStep(next);
    };

    const back = () => {
        const previous = STEPS[STEPS.indexOf(step) - 1];
        if (previous) setStep(previous);
        else onClose();
    };

    const confirm = (data: { name: string; email: string; notes: string }) => {
        if (!service || !employee || !date || !time) return;
        // ponytail: acá va POST /bookings; nace UNVERIFIED hasta que el Cliente verifica el mail.
        onBooked({
            id: `b-${service.id}-${date}-${time}`,
            business,
            branch,
            service,
            employee,
            date,
            time,
            status: 'UNVERIFIED',
            client: { name: data.name, email: data.email },
            notes: data.notes || undefined,
            photo,
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
                        <Breadcrumb step={step} onGo={setStep} />
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

                        {step === 'employee' && service && (
                            <EmployeeStep
                                service={service}
                                chosen={employee}
                                onChoose={chooseEmployee}
                            />
                        )}

                        {step === 'time' && service && employee && (
                            <TimeStep
                                service={service}
                                employee={employee}
                                branch={branch}
                                date={date}
                                time={time}
                                onSelect={(nextDate, nextTime) =>
                                    setDraft((d) => ({ ...d, date: nextDate, time: nextTime }))
                                }
                                onSeeEmployees={() => setStep('employee')}
                            />
                        )}

                        {step === 'confirm' && service && (
                            <ConfirmStep
                                business={business}
                                service={service}
                                onSubmit={confirm}
                            />
                        )}
                    </div>

                    <aside className="hidden lg:sticky lg:top-6 lg:block">
                        <SummaryPanel
                            business={business}
                            branch={branch}
                            photo={photo}
                            draft={draft}
                            step={step}
                            canAdvance={canAdvance}
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
                            ? `${service.name}${employee ? ` con ${employee.name}` : ''}`
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
                <AdvanceButton step={step} canAdvance={canAdvance} onAdvance={advance} />
            </div>
        </div>
    );
}
