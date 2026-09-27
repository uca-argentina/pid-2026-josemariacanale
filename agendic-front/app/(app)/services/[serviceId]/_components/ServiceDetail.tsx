'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, ChevronRight, Clock, ExternalLink, Globe, Info, Link2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { slugify } from '@/app/onboarding/_components/schemas';
import { cn } from '@/app/_components/utils';
import {
    PanelButton,
    PanelCard,
    PanelConfirm,
    PanelDivider,
    PanelField,
    PanelIconButton,
    PanelIconGroup,
    PanelInput,
    PanelSelect,
    PanelSwitch,
    PanelTextarea,
} from '@/app/(app)/_components/panel-ui';
import { OfferButton, PublicLinkButtons } from '../../_components/service-actions';
import {
    depositAmount,
    formatPrice,
    bookingLink,
    publicUrl,
    type ServiceGroup,
    type ServiceItem,
} from '@/app/(app)/_components/mock-services';
import { DAY_NAMES, type Availability } from '@/app/(app)/_components/mock-availability';

type TabId = 'setup' | 'availability' | 'limits';

const PREP_OPTIONS = [0, 5, 10, 15, 30, 60].map((m) => ({
    value: String(m),
    label: m === 0 ? 'Sin preparación' : `${m} minutos`,
}));

function ToggleRow({
    id,
    title,
    description,
    checked,
    onCheckedChange,
    disabled,
}: {
    id: string;
    title: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-start gap-3">
            <PanelSwitch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
            <div className="flex flex-col gap-0.5">
                <label htmlFor={id} className="text-[13.5px] font-bold tracking-[-0.01em] text-[#0f1b2d]">
                    {title}
                </label>
                <p className="m-0 text-[12.5px] font-medium text-[#6b7280]">{description}</p>
            </div>
        </div>
    );
}

function SetupTab({
    draft,
    set,
    businessSlug,
    readOnly,
}: {
    draft: ServiceItem;
    set: (patch: Partial<ServiceItem>) => void;
    businessSlug: string;
    readOnly: boolean;
}) {
    const deposit = depositAmount(draft.price, draft.deposit.percent);

    return (
        <>
            <PanelCard className="flex flex-col gap-6">
                <PanelField label="Título" htmlFor="service-name">
                    <PanelInput id="service-name" value={draft.name} disabled={readOnly} onChange={(e) => set({ name: e.target.value })} />
                </PanelField>
                <PanelField label="Descripción" htmlFor="service-description">
                    <PanelTextarea
                        id="service-description"
                        value={draft.description}
                        disabled={readOnly}
                        placeholder="Contale a tus clientes de qué se trata el servicio."
                        onChange={(e) => set({ description: e.target.value })}
                    />
                </PanelField>
                <PanelField label="URL" htmlFor="service-slug">
                    <PanelInput
                        id="service-slug"
                        prefix={`${bookingLink(businessSlug)}/`}
                        value={draft.slug}
                        disabled={readOnly}
                        onChange={(e) => set({ slug: slugify(e.target.value) })}
                    />
                </PanelField>
            </PanelCard>

            <PanelCard className="flex flex-col gap-6">
                <PanelField label="Duración" htmlFor="service-duration">
                    <PanelInput
                        id="service-duration"
                        type="number"
                        min={1}
                        suffix="Minutos"
                        value={draft.durationMinutes}
                        disabled={readOnly}
                        onChange={(e) => set({ durationMinutes: Number(e.target.value) })}
                    />
                </PanelField>
                <PanelField label="Precio" htmlFor="service-price">
                    <PanelInput
                        id="service-price"
                        type="number"
                        min={0}
                        prefix="$"
                        suffix="ARS"
                        value={draft.price}
                        disabled={readOnly}
                        onChange={(e) => set({ price: Number(e.target.value) })}
                    />
                </PanelField>
            </PanelCard>

            <PanelCard className="flex flex-col gap-5">
                <ToggleRow
                    id="service-deposit"
                    title="Pedir seña"
                    description="El cliente paga un porcentaje del precio al reservar para asegurar el turno."
                    checked={draft.deposit.enabled}
                    disabled={readOnly}
                    onCheckedChange={(enabled) => set({ deposit: { ...draft.deposit, enabled } })}
                />
                {draft.deposit.enabled && (
                    <div className="flex flex-wrap items-center gap-3 pl-14">
                        <PanelInput
                            aria-label="Porcentaje de la seña"
                            type="number"
                            min={1}
                            max={100}
                            suffix="%"
                            className="w-[120px]"
                            value={draft.deposit.percent}
                            disabled={readOnly}
                            onChange={(e) => set({ deposit: { ...draft.deposit, percent: Number(e.target.value) } })}
                        />
                        <span className="text-[13px] font-medium text-[#6b7280]">
                            Seña de <strong className="font-bold text-[#0f1b2d]">{formatPrice(deposit)}</strong> · resta{' '}
                            {formatPrice(draft.price - deposit)} al atender
                        </span>
                    </div>
                )}
            </PanelCard>
        </>
    );
}

function AvailabilityTab({
    availability,
    set,
    availabilities,
}: {
    availability: Availability;
    set: (patch: Partial<ServiceItem>) => void;
    availabilities: Availability[];
}) {
    return (
        <PanelCard className="overflow-hidden p-0">
            <div className="border-b border-[#e5e7eb] p-6">
                <PanelField label="Tu disponibilidad para este servicio" htmlFor="service-availability">
                    <PanelSelect
                        id="service-availability"
                        value={availability.id}
                        onValueChange={(availabilityId) => set({ availabilityId })}
                        options={availabilities.map((a) => ({
                            value: a.id,
                            label: a.name,
                            badge: a.isDefault ? 'Predeterminado' : undefined,
                        }))}
                    />
                </PanelField>
            </div>

            <div className="flex flex-col gap-5 p-6">
                {availability.days.map((intervals, i) => (
                    <div key={DAY_NAMES[i]} className="grid grid-cols-[140px_1fr] items-start text-[13.5px] font-medium">
                        <span className={cn('font-bold tracking-[-0.01em]', intervals.length === 0 && 'text-[#6b7280] line-through')}>
                            {DAY_NAMES[i]}
                        </span>
                        {intervals.length === 0 ? (
                            <span className="text-[#6b7280]">No disponible</span>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {intervals.map(([from, to]) => (
                                    <div key={from} className="grid w-fit grid-cols-[64px_32px_64px] tabular-nums">
                                        <span>{from}</span>
                                        <span className="text-[#6b7280]">-</span>
                                        <span>{to}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-[#e5e7eb] bg-[#f9fafb] px-6 py-5 text-[13px] font-medium">
                <span className="flex items-center gap-2">
                    <Globe className="size-4 text-[#6b7280]" />
                    Hora local de cada Sucursal
                </span>
                <Link
                    href="/availability"
                    className="ml-auto flex items-center gap-1.5 font-semibold text-[#6b7280] hover:text-[#0f1b2d]"
                >
                    Editar disponibilidad
                    <ExternalLink className="size-4" />
                </Link>
            </div>
        </PanelCard>
    );
}

function LimitsTab({
    draft,
    set,
    readOnly,
}: {
    draft: ServiceItem;
    set: (patch: Partial<ServiceItem>) => void;
    readOnly: boolean;
}) {
    return (
        <>
            <PanelCard>
                <PanelField
                    label="Tiempo de preparación"
                    htmlFor="service-prep"
                    hint="Se bloquea antes de cada turno para preparar el espacio o el equipo."
                >
                    <PanelSelect
                        id="service-prep"
                        value={String(draft.prepMinutes)}
                        disabled={readOnly}
                        onValueChange={(v) => set({ prepMinutes: Number(v) })}
                        options={PREP_OPTIONS}
                    />
                </PanelField>
            </PanelCard>

            <PanelCard className="flex flex-col gap-5">
                <ToggleRow
                    id="service-daily-limit"
                    title="Limitar turnos por día"
                    description="Máximo de turnos de este servicio por día, aunque el horario tenga lugar."
                    checked={draft.dailyLimit.enabled}
                    disabled={readOnly}
                    onCheckedChange={(enabled) => set({ dailyLimit: { ...draft.dailyLimit, enabled } })}
                />
                {draft.dailyLimit.enabled && (
                    <div className="pl-14">
                        <PanelInput
                            aria-label="Máximo de turnos por día"
                            type="number"
                            min={1}
                            suffix="turnos por día"
                            className="w-[220px]"
                            value={draft.dailyLimit.max}
                            disabled={readOnly}
                            onChange={(e) => set({ dailyLimit: { ...draft.dailyLimit, max: Number(e.target.value) } })}
                        />
                    </div>
                )}
            </PanelCard>
        </>
    );
}

export function ServiceDetail({
    business,
    role,
    service,
    availabilities,
}: {
    business: ServiceGroup['business'];
    role: ServiceGroup['role'];
    service: ServiceItem;
    availabilities: Availability[];
}) {
    const [saved, setSaved] = useState(service);
    const [draft, setDraft] = useState(service);
    const [tab, setTab] = useState<TabId>('setup');
    const [confirmRemove, setConfirmRemove] = useState(false);
    const isOwner = role === 'owner';
    const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
    const valid =
        draft.name.trim() !== '' &&
        draft.slug !== '' &&
        draft.durationMinutes > 0 &&
        draft.price >= 0 &&
        (!draft.deposit.enabled || (draft.deposit.percent >= 1 && draft.deposit.percent <= 100)) &&
        (!draft.dailyLimit.enabled || draft.dailyLimit.max >= 1);
    const set = (patch: Partial<ServiceItem>) => setDraft((d) => ({ ...d, ...patch }));

    const availability = availabilities.find((a) => a.id === draft.availabilityId) ?? availabilities[0];
    const limitsSummary = [
        draft.prepMinutes ? `Preparación ${draft.prepMinutes} min` : 'Sin preparación',
        draft.dailyLimit.enabled && `máx. ${draft.dailyLimit.max}/día`,
    ]
        .filter(Boolean)
        .join(' · ');

    const tabs: { id: TabId; icon: typeof Link2; title: string; subtitle: string }[] = [
        { id: 'setup', icon: Link2, title: 'Configuración', subtitle: `${draft.durationMinutes} min · ${formatPrice(draft.price)}` },
        { id: 'availability', icon: Calendar, title: 'Disponibilidad', subtitle: availability.name },
        { id: 'limits', icon: Clock, title: 'Límites', subtitle: limitsSummary },
    ];

    const save = () => {
        // ponytail: no persiste; se reemplaza por la server action cuando exista el endpoint.
        setSaved(draft);
        toast.success(`${draft.name}: servicio actualizado`);
    };

    return (
        <div className="flex-1 bg-white px-4 py-6 text-[#0f1b2d] sm:px-8">
            <header className="flex flex-wrap items-center gap-3">
                <Link
                    href="/services"
                    aria-label="Volver a Servicios"
                    className="rounded-md p-1.5 text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#0f1b2d]"
                >
                    <ArrowLeft className="size-5" />
                </Link>
                <h1 className="m-0 min-w-0 truncate text-[21px] font-extrabold tracking-[-0.035em]">{draft.name || saved.name}</h1>

                <div className="ml-auto flex items-center gap-3">
                    {isOwner && (
                        <PanelSwitch
                            checked={draft.visible}
                            onCheckedChange={(visible) => set({ visible })}
                            aria-label={draft.visible ? 'Ocultar del Enlace de reserva' : 'Mostrar en el Enlace de reserva'}
                        />
                    )}
                    <OfferButton service={saved} />
                    <PanelDivider />
                    <PanelIconGroup>
                        <PublicLinkButtons url={publicUrl(business.slug, saved.slug)} />
                        {isOwner && (
                            <PanelIconButton label="Dar de baja" destructive onClick={() => setConfirmRemove(true)}>
                                <Trash2 />
                            </PanelIconButton>
                        )}
                    </PanelIconGroup>
                    <PanelDivider />
                    <PanelButton disabled={!dirty || !valid} onClick={save}>
                        Guardar
                    </PanelButton>
                </div>
            </header>

            <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
                <nav role="tablist" aria-orientation="vertical" className="flex flex-col gap-1">
                    {tabs.map(({ id, icon: Icon, title, subtitle }) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            onClick={() => setTab(id)}
                            aria-selected={tab === id}
                            className={cn(
                                'flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-[#f3f4f6]',
                                tab === id && 'bg-[#f3f4f6]',
                            )}
                        >
                            <Icon className="mt-0.5 size-4 shrink-0" />
                            <span className="flex min-w-0 flex-col">
                                <span className="text-[13.5px] font-bold tracking-[-0.01em]">{title}</span>
                                <span className="truncate text-[12.5px] font-medium text-[#6b7280]">{subtitle}</span>
                            </span>
                            {tab === id && <ChevronRight className="mt-2 ml-auto size-4 shrink-0" />}
                        </button>
                    ))}
                </nav>

                <div role="tabpanel" className="flex flex-col gap-6">
                    {!isOwner && tab !== 'availability' && (
                        <div className="flex items-start gap-2.5 rounded-md bg-[#f3f4f6] px-4 py-3 text-[13px] font-medium text-[#374151]">
                            <Info className="mt-0.5 size-4 shrink-0" />
                            <span>
                                Solo el Dueño de {business.name} puede editar este servicio. Vos elegís en qué horario lo
                                atendés, en Disponibilidad.
                            </span>
                        </div>
                    )}
                    {tab === 'setup' && <SetupTab draft={draft} set={set} businessSlug={business.slug} readOnly={!isOwner} />}
                    {tab === 'availability' && <AvailabilityTab availability={availability} set={set} availabilities={availabilities} />}
                    {tab === 'limits' && <LimitsTab draft={draft} set={set} readOnly={!isOwner} />}
                </div>
            </div>

            <PanelConfirm
                open={confirmRemove}
                onOpenChange={setConfirmRemove}
                title="¿Dar de baja este servicio?"
                description="Deja de aparecer en tu agenda y sus turnos futuros quedan cancelados."
                confirmLabel="Dar de baja"
                destructive
                // ponytail: todavía no hace nada; se conecta cuando exista el endpoint.
                onConfirm={() => {}}
            />
        </div>
    );
}
