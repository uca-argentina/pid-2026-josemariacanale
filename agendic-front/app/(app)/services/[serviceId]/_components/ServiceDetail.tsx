'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, ChevronRight, Clock, ExternalLink, Globe, Info, Link2, Loader2, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { FieldErrors } from '@/app/_components/business-schemas';
import { cn } from '@/app/_components/utils';
import {
    PanelAvatar,
    PanelBadge,
    PanelButton,
    PanelCard,
    PanelDivider,
    PanelField,
    PanelIconButton,
    PanelIconGroup,
    PanelInput,
    PanelSelect,
    PanelTextarea,
    PanelToggleRow,
} from '@/app/(app)/_components/panel-ui';
import { DAY_NAMES, type Availability } from '@/app/(app)/_components/mock-availability';
import { bookingLinkPath } from '@/app/routes';
import { updateServiceAction } from '../../actions';
import { formatPrice } from '../../_components/format';
import {
    HiddenSwitch,
    OfferButton,
    PublicLinkButtons,
    RetireServiceConfirm,
    StopOfferingConfirm,
    offerService,
    type OfferingEmployee,
} from '../../_components/service-actions';
import {
    CATEGORY_OPTIONS,
    editFormOf,
    serviceChanges,
    slugWhileTyping,
    type ServiceEditForm,
} from '../../_components/service-form';
import type { ServiceDetailData } from '../../_components/types';

type TabId = 'setup' | 'employees' | 'availability' | 'limits';

const NAMES = new Intl.ListFormat('es', { type: 'conjunction' });

/** Lo que muestra la pestaña Límites. Todavía no se guarda: es de otro ticket. */
interface Limits {
    prepMinutes: number;
    dailyLimit: { enabled: boolean; max: number };
}

const PREP_OPTIONS = [0, 5, 10, 15, 30, 60].map((m) => ({
    value: String(m),
    label: m === 0 ? 'Sin preparación' : `${m} minutos`,
}));

function SetupTab({
    draft,
    set,
    errors,
    slugPrefix,
    slugChanged,
    readOnly,
}: {
    draft: ServiceEditForm;
    set: (patch: Partial<ServiceEditForm>) => void;
    errors: FieldErrors;
    slugPrefix: string;
    slugChanged: boolean;
    readOnly: boolean;
}) {
    const price = Number(draft.price) || 0;
    const percent = Number(draft.depositPercent) || 0;
    const deposit = Math.round((price * percent) / 100);
    const describedBy = (field: string, id: string) => (errors[field] ? `${id}-error` : undefined);

    return (
        <>
            <PanelCard className="flex flex-col gap-6">
                <PanelField label="Título" htmlFor="service-name" error={errors.name}>
                    <PanelInput
                        id="service-name"
                        value={draft.name}
                        disabled={readOnly}
                        aria-describedby={describedBy('name', 'service-name')}
                        onChange={(e) => set({ name: e.target.value })}
                    />
                </PanelField>
                <PanelField label="Descripción" htmlFor="service-description" error={errors.description}>
                    <PanelTextarea
                        id="service-description"
                        value={draft.description}
                        disabled={readOnly}
                        placeholder="Contale a tus clientes de qué se trata el servicio."
                        aria-describedby={describedBy('description', 'service-description')}
                        onChange={(e) => set({ description: e.target.value })}
                    />
                </PanelField>
                <PanelField
                    label="Enlace de reserva"
                    htmlFor="service-slug"
                    error={errors.slug}
                    hint={slugChanged ? 'Al guardar, el Enlace de reserva anterior de este Servicio deja de funcionar.' : undefined}
                >
                    <PanelInput
                        id="service-slug"
                        prefix={slugPrefix}
                        value={draft.slug}
                        disabled={readOnly}
                        aria-describedby={describedBy('slug', 'service-slug')}
                        onChange={(e) => set({ slug: slugWhileTyping(e.target.value) })}
                    />
                </PanelField>
                <PanelField label="Categoría de Servicio" htmlFor="service-category" error={errors.category}>
                    <PanelSelect
                        id="service-category"
                        value={draft.category}
                        disabled={readOnly}
                        onValueChange={(category) => set({ category: category as ServiceEditForm['category'] })}
                        options={CATEGORY_OPTIONS}
                    />
                </PanelField>
            </PanelCard>

            <PanelCard className="flex flex-col gap-6">
                <PanelField label="Duración" htmlFor="service-duration" error={errors.durationMinutes}>
                    <PanelInput
                        id="service-duration"
                        type="number"
                        min={1}
                        suffix="Minutos"
                        value={draft.durationMinutes}
                        disabled={readOnly}
                        aria-describedby={describedBy('durationMinutes', 'service-duration')}
                        onChange={(e) => set({ durationMinutes: e.target.value })}
                    />
                </PanelField>
                <PanelField label="Precio" htmlFor="service-price" error={errors.price}>
                    <PanelInput
                        id="service-price"
                        type="number"
                        min={0}
                        prefix="$"
                        suffix="ARS"
                        value={draft.price}
                        disabled={readOnly}
                        aria-describedby={describedBy('price', 'service-price')}
                        onChange={(e) => set({ price: e.target.value })}
                    />
                </PanelField>
            </PanelCard>

            <PanelCard className="flex flex-col gap-5">
                <PanelToggleRow
                    id="service-deposit"
                    title="Pedir seña"
                    description="El cliente declara al reservar que adelanta un porcentaje del precio."
                    checked={draft.depositEnabled}
                    disabled={readOnly}
                    onCheckedChange={(depositEnabled) => set({ depositEnabled })}
                />
                {draft.depositEnabled && (
                    <div className="flex flex-col gap-2 pl-14">
                        <div className="flex flex-wrap items-center gap-3">
                            <PanelInput
                                id="service-deposit-percent"
                                aria-label="Porcentaje de la seña"
                                type="number"
                                min={1}
                                max={100}
                                suffix="%"
                                className="w-[120px]"
                                value={draft.depositPercent}
                                disabled={readOnly}
                                aria-describedby={describedBy('depositPercent', 'service-deposit-percent')}
                                onChange={(e) => set({ depositPercent: e.target.value })}
                            />
                            <span className="text-[13px] font-medium text-[#6b7280]">
                                Seña de <strong className="font-bold text-[#0f1b2d]">{formatPrice(deposit)}</strong> · resta{' '}
                                {formatPrice(price - deposit)} al atender
                            </span>
                        </div>
                        {errors.depositPercent && (
                            <p
                                id="service-deposit-percent-error"
                                role="alert"
                                className="m-0 text-[12.5px] font-medium text-[#b91c1c]"
                            >
                                {errors.depositPercent}
                            </p>
                        )}
                    </div>
                )}
                <PanelToggleRow
                    id="service-requires-approval"
                    title="Aprobación manual"
                    description="Los Turnos quedan pendientes hasta que el Empleado los acepte o los rechace."
                    checked={draft.requiresApproval}
                    disabled={readOnly}
                    onCheckedChange={(requiresApproval) => set({ requiresApproval })}
                />
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
    set: (availabilityId: string) => void;
    availabilities: Availability[];
}) {
    return (
        <PanelCard className="overflow-hidden p-0">
            <div className="border-b border-[#e5e7eb] p-6">
                <PanelField label="Tu disponibilidad para este servicio" htmlFor="service-availability">
                    <PanelSelect
                        id="service-availability"
                        value={availability.id}
                        onValueChange={set}
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
    draft: Limits;
    set: (patch: Partial<Limits>) => void;
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
                <PanelToggleRow
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

/**
 * La sección Empleados del Dueño: quiénes atienden el Servicio, quitar a cualquiera con las mismas reglas que dejar de
 * ofrecerlo, y Ofrecerlo en nombre de otro Empleado del Staff.
 */
function EmployeesTab({
    service,
    staff,
    myEmployeeId,
}: {
    service: ServiceDetailData['service'];
    staff: NonNullable<ServiceDetailData['staff']>;
    myEmployeeId: number;
}) {
    const router = useRouter();
    const [removing, setRemoving] = useState<OfferingEmployee | null>(null);
    const [adding, setAdding] = useState('');
    const [offering, startOffering] = useTransition();
    const asOfferingEmployee = (e: { id: number; name: string }): OfferingEmployee => ({ ...e, isMe: e.id === myEmployeeId });
    const available = staff.filter((e) => !service.employees.some((s) => s.id === e.id));

    const add = () => {
        const employee = staff.find((e) => String(e.id) === adding);
        if (!employee) return;
        startOffering(async () => {
            await offerService(service, asOfferingEmployee(employee));
            setAdding('');
        });
    };

    return (
        <PanelCard className="flex flex-col gap-5">
            <ul className="m-0 flex list-none flex-col divide-y divide-[#e5e7eb] p-0">
                {service.employees.map((employee) => (
                    <li key={employee.id} className="flex items-center gap-3 py-3 first:pt-0">
                        <PanelAvatar name={employee.name} />
                        <span className="text-[13.5px] font-bold tracking-[-0.01em]">{employee.name}</span>
                        {employee.id === myEmployeeId && <PanelBadge>Vos</PanelBadge>}
                        <PanelButton variant="ghost" className="ml-auto" onClick={() => setRemoving(asOfferingEmployee(employee))}>
                            Quitar
                        </PanelButton>
                    </li>
                ))}
            </ul>

            {available.length > 0 ? (
                <div className="flex flex-wrap items-end gap-3 border-t border-[#e5e7eb] pt-5">
                    <div className="min-w-[220px] flex-1">
                        <PanelField label="Ofrecerlo en nombre de" htmlFor="service-add-employee">
                            <PanelSelect
                                id="service-add-employee"
                                value={adding}
                                onValueChange={setAdding}
                                disabled={offering}
                                options={available.map((e) => ({ value: String(e.id), label: e.name }))}
                                placeholder="Elegí un Empleado del Staff"
                            />
                        </PanelField>
                    </div>
                    <PanelButton disabled={!adding || offering} onClick={add} className="min-w-[96px]">
                        {offering ? <Loader2 className="size-4 animate-spin" /> : 'Ofrecer'}
                    </PanelButton>
                </div>
            ) : (
                <p className="m-0 border-t border-[#e5e7eb] pt-5 text-[13px] font-medium text-[#6b7280]">
                    Todo el Staff ya ofrece este Servicio.
                </p>
            )}

            {removing && (
                <StopOfferingConfirm
                    service={service}
                    employee={removing}
                    open
                    onOpenChange={(open) => !open && setRemoving(null)}
                    onStopped={() => router.refresh()}
                />
            )}
        </PanelCard>
    );
}

/**
 * El detalle de un Servicio. El Dueño edita y guarda la Configuración, lo oculta y lo da de baja; un Empleado lo ve en
 * solo lectura. El Dueño además elige quiénes lo atienden, en Empleados. Las pestañas Disponibilidad y Límites
 * todavía no guardan.
 */
export function ServiceDetail({ detail, availabilities }: { detail: ServiceDetailData; availabilities: Availability[] }) {
    const { business, branch, service } = detail;
    const router = useRouter();
    const saved = editFormOf(service);
    const [draft, setDraft] = useState(saved);
    const [savedKey, setSavedKey] = useState(JSON.stringify(saved));
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, startSaving] = useTransition();
    const [tab, setTab] = useState<TabId>('setup');
    const [confirmRetire, setConfirmRetire] = useState(false);
    const [availabilityId, setAvailabilityId] = useState(availabilities[0]?.id);
    const [limits, setLimits] = useState<Limits>({ prepMinutes: 0, dailyLimit: { enabled: false, max: 1 } });
    const isOwner = detail.role === 'owner';

    if (savedKey !== JSON.stringify(saved)) {
        setSavedKey(JSON.stringify(saved));
        setDraft(saved);
    }

    const edit = serviceChanges(saved, draft);
    const dirty = !edit.ok || Object.keys(edit.changes).length > 0;

    const set = (patch: Partial<ServiceEditForm>) => {
        setDraft((d) => ({ ...d, ...patch }));
        setErrors((e) => {
            const next = { ...e };
            for (const field of Object.keys(patch)) delete next[field];
            if ('depositEnabled' in patch) delete next.depositPercent;
            return next;
        });
        setFormError(null);
    };

    const save = () => {
        if (!edit.ok) {
            setErrors(edit.errors);
            return;
        }
        startSaving(async () => {
            const saveResult = await updateServiceAction({ id: service.id, ...edit.changes });
            if (saveResult.ok) toast.success(`${saveResult.name}: servicio actualizado`);
            else if (saveResult.field) setErrors((prev) => ({ ...prev, [saveResult.field!]: saveResult.message }));
            else setFormError(saveResult.message);
        });
    };

    const availability = availabilities.find((a) => a.id === availabilityId) ?? availabilities[0];
    const limitsSummary = [
        limits.prepMinutes ? `Preparación ${limits.prepMinutes} min` : 'Sin preparación',
        limits.dailyLimit.enabled && `máx. ${limits.dailyLimit.max}/día`,
    ]
        .filter(Boolean)
        .join(' · ');

    const tabs: { id: TabId; icon: typeof Link2; title: string; subtitle: string }[] = [
        {
            id: 'setup',
            icon: Link2,
            title: 'Configuración',
            subtitle: `${service.durationMinutes} min · ${formatPrice(service.price)}`,
        },
        ...(detail.staff
            ? [
                  {
                      id: 'employees' as const,
                      icon: Users,
                      title: 'Empleados',
                      subtitle: service.employees.map((e) => e.name).join(', '),
                  },
              ]
            : []),
        { id: 'availability', icon: Calendar, title: 'Disponibilidad', subtitle: availability?.name ?? '' },
        { id: 'limits', icon: Clock, title: 'Límites', subtitle: limitsSummary },
    ];

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
                <div className="flex min-w-0 flex-col">
                    <div className="flex min-w-0 items-center gap-2">
                        <h1 className="m-0 min-w-0 truncate text-[21px] font-extrabold tracking-[-0.035em]">{service.name}</h1>
                        {service.offeredByMe && <PanelBadge className="bg-[#e6f6ec] text-[#15803d]">Lo ofrecés</PanelBadge>}
                    </div>
                    <span className="truncate text-[12.5px] font-medium text-[#6b7280]">
                        Lo atienden {NAMES.format(service.employees.map((e) => e.name))}
                    </span>
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-3">
                    {isOwner && <HiddenSwitch service={service} showLabel />}
                    <OfferButton
                        service={service}
                        employeeId={detail.employeeId}
                        onStopped={() => (!isOwner && service.hidden ? router.replace('/services') : router.refresh())}
                    />
                    <PanelDivider />
                    <PanelIconGroup>
                        <PublicLinkButtons path={bookingLinkPath(business.slug, branch.slug, service.slug)} />
                        {isOwner && (
                            <PanelIconButton label="Dar de baja" destructive onClick={() => setConfirmRetire(true)}>
                                <Trash2 />
                            </PanelIconButton>
                        )}
                    </PanelIconGroup>
                    {isOwner && (
                        <>
                            <PanelDivider />
                            <PanelButton disabled={!dirty || saving} onClick={save} className="min-w-[88px]">
                                {saving ? <Loader2 className="size-4 animate-spin" /> : 'Guardar'}
                            </PanelButton>
                        </>
                    )}
                </div>
            </header>
            {formError && (
                <p role="alert" className="m-0 mt-3 text-right text-[12.5px] font-medium text-[#b91c1c]">
                    {formError}
                </p>
            )}

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
                    {tab === 'setup' && (
                        <SetupTab
                            draft={draft}
                            set={set}
                            errors={errors}
                            slugPrefix={`${bookingLinkPath(business.slug, branch.slug)}/`}
                            slugChanged={draft.slug !== saved.slug}
                            readOnly={!isOwner || saving}
                        />
                    )}
                    {tab === 'employees' && detail.staff && (
                        <EmployeesTab service={service} staff={detail.staff} myEmployeeId={detail.employeeId} />
                    )}
                    {tab === 'availability' && availability && (
                        <AvailabilityTab availability={availability} set={setAvailabilityId} availabilities={availabilities} />
                    )}
                    {tab === 'limits' && (
                        <LimitsTab draft={limits} set={(patch) => setLimits((l) => ({ ...l, ...patch }))} readOnly={!isOwner} />
                    )}
                </div>
            </div>

            {isOwner && (
                <RetireServiceConfirm
                    service={service}
                    open={confirmRetire}
                    onOpenChange={setConfirmRetire}
                    onRetired={() => router.replace('/services')}
                />
            )}
        </div>
    );
}
