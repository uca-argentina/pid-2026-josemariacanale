'use client';

import { useOptimistic, useState, useTransition } from 'react';
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
import { DAY_NAMES, toWeek } from '@/app/(app)/_components/availability-week';
import { bookingLinkPath, userLinkPath } from '@/app/routes';
import { changeEmployeeAvailabilityAction, updateServiceAction } from '../../actions';
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
import { PREP_MINUTES } from '@/src/entities/models/service';

type TabId = 'setup' | 'employees' | 'availability' | 'limits';

// Los campos de la pestaña Límites: si solo fallan estos, guardar abre esa pestaña.
const LIMITS_FIELDS = ['dailyLimit', 'slotInterval', 'minimumNoticeMinutes'];

const NAMES = new Intl.ListFormat('es', { type: 'conjunction' });

const PREP_OPTIONS = PREP_MINUTES.map((m) => ({
    value: String(m),
    label: m === 0 ? 'Sin preparación' : `${m} minutos`,
}));

/** El error de un input que no va en un `PanelField`, como el porcentaje de la Seña o el máximo del Límite diario. */
function InlineFieldError({ id, error }: { id: string; error?: string }) {
    if (!error) return null;
    return (
        <p id={`${id}-error`} role="alert" className="m-0 text-[12.5px] font-medium text-[#b91c1c]">
            {error}
        </p>
    );
}

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
                        <InlineFieldError id="service-deposit-percent" error={errors.depositPercent} />
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

/**
 * La pestaña Horas laborables: si el Usuario atiende el Servicio, elige con cuál de sus Availability lo hace, y se
 * guarda en el momento; debajo, las Franjas de la elegida de lunes a domingo, en solo lectura. Si no lo atiende, lo
 * invita a Ofrecerlo. Un Servicio personal siempre lo atiende el Usuario.
 */
function AvailabilityTab({ detail, onStopped }: { detail: ServiceDetailData; onStopped: () => void }) {
    const { service, availabilities } = detail;
    const [chosenId, setChosenId] = useOptimistic(detail.myAvailabilityId);
    const [saving, startSaving] = useTransition();

    if (!availabilities && detail.kind === 'business')
        return (
            <PanelCard className="flex flex-col items-start gap-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[14.5px] font-bold tracking-[-0.02em]">Todavía no ofrecés este Servicio</span>
                    <span className="text-[13px] font-medium text-[#6b7280]">
                        Ofrecelo para atenderlo con tus Horas laborables predeterminadas. Después podés elegir otras acá.
                    </span>
                </div>
                <OfferButton service={service} employeeId={detail.employeeId} onStopped={onStopped} />
            </PanelCard>
        );

    const chosen = availabilities?.find((a) => a.id === chosenId);
    const week = chosen ? toWeek(chosen.schedule) : [];

    const choose = (value: string) =>
        startSaving(async () => {
            const availabilityId = Number(value);
            setChosenId(availabilityId);
            const result =
                detail.kind === 'personal'
                    ? await updateServiceAction({ id: service.id, availabilityId })
                    : await changeEmployeeAvailabilityAction({ serviceId: service.id, employeeId: detail.employeeId, availabilityId });
            if (result.ok) toast.success(`${result.name}: Horas laborables actualizadas`);
            else toast.error(result.message);
        });

    return (
        <PanelCard className="overflow-hidden p-0">
            <div className="border-b border-[#e5e7eb] p-6">
                <PanelField
                    label="Tus Horas laborables para este Servicio"
                    htmlFor="service-availability"
                    hint="Cambiarlas no toca los Turnos que ya tenés."
                >
                    <PanelSelect
                        id="service-availability"
                        value={chosen ? String(chosen.id) : ''}
                        disabled={saving}
                        onValueChange={choose}
                        options={(availabilities ?? []).map((a) => ({
                            value: String(a.id),
                            label: a.name,
                            badge: a.isDefault ? 'Predeterminada' : undefined,
                        }))}
                        placeholder="Elegí tus Horas laborables"
                    />
                </PanelField>
            </div>

            <div className="flex flex-col gap-5 p-6">
                {week.map((intervals, i) => (
                    <div key={DAY_NAMES[i]} className="grid grid-cols-[140px_1fr] items-start text-[13.5px] font-medium">
                        <span className={cn('font-bold tracking-[-0.01em]', intervals.length === 0 && 'text-[#6b7280] line-through')}>
                            {DAY_NAMES[i]}
                        </span>
                        {intervals.length === 0 ? (
                            <span className="text-[#6b7280]">No disponible</span>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {intervals.map(({ start, end }) => (
                                    <div key={start} className="grid w-fit grid-cols-[64px_32px_64px] tabular-nums">
                                        <span>{start}</span>
                                        <span className="text-[#6b7280]">-</span>
                                        <span>{end}</span>
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
                    {detail.kind === 'personal' ? 'Hora local de estas Horas laborables' : 'Hora local de cada Sucursal'}
                </span>
                {detail.role === 'owner' && (
                    <Link
                        href={detail.kind === 'personal' ? '/availability' : `/availability?empleado=${detail.employeeId}`}
                        className="ml-auto flex items-center gap-1.5 font-semibold text-[#6b7280] hover:text-[#0f1b2d]"
                    >
                        Editar Horas laborables
                        <ExternalLink className="size-4" />
                    </Link>
                )}
            </div>
        </PanelCard>
    );
}

function LimitsTab({
    draft,
    set,
    errors,
    readOnly,
}: {
    draft: ServiceEditForm;
    set: (patch: Partial<ServiceEditForm>) => void;
    errors: FieldErrors;
    readOnly: boolean;
}) {
    return (
        <>
            <PanelCard>
                <PanelField
                    label="Tiempo de preparación"
                    htmlFor="service-prep"
                    hint="Se bloquea antes de cada Turno para preparar el espacio o el equipo."
                >
                    <PanelSelect
                        id="service-prep"
                        value={draft.prepMinutes}
                        disabled={readOnly}
                        onValueChange={(prepMinutes) => set({ prepMinutes })}
                        options={PREP_OPTIONS}
                    />
                </PanelField>
            </PanelCard>

            <PanelCard className="flex flex-col gap-5">
                <PanelField
                    label="Intervalo"
                    htmlFor="service-slot-interval"
                    error={errors.slotInterval}
                    hint="Cada cuántos minutos arranca un horario reservable. Vacío, es la duración del Servicio."
                >
                    <PanelInput
                        id="service-slot-interval"
                        type="number"
                        min={1}
                        suffix="minutos"
                        className="w-[220px]"
                        value={draft.slotInterval}
                        disabled={readOnly}
                        onChange={(e) => set({ slotInterval: e.target.value })}
                    />
                </PanelField>
                <PanelField
                    label="Anticipación mínima"
                    htmlFor="service-minimum-notice"
                    error={errors.minimumNoticeMinutes}
                    hint="Minutos que tienen que faltar como mínimo para el inicio de un Turno al reservarlo. 0, hasta el último momento."
                >
                    <PanelInput
                        id="service-minimum-notice"
                        type="number"
                        min={0}
                        suffix="minutos"
                        className="w-[220px]"
                        value={draft.minimumNoticeMinutes}
                        disabled={readOnly}
                        onChange={(e) => set({ minimumNoticeMinutes: e.target.value })}
                    />
                </PanelField>
            </PanelCard>

            <PanelCard className="flex flex-col gap-5">
                <PanelToggleRow
                    id="service-daily-limit"
                    title="Límite diario"
                    description="Máximo de Turnos de este Servicio por día, sumando a todos sus Empleados, aunque el horario tenga lugar."
                    checked={draft.dailyLimitEnabled}
                    disabled={readOnly}
                    onCheckedChange={(dailyLimitEnabled) => set({ dailyLimitEnabled })}
                />
                {draft.dailyLimitEnabled && (
                    <div className="flex flex-col gap-2 pl-14">
                        <PanelInput
                            id="service-daily-limit-max"
                            aria-label="Máximo de Turnos por día"
                            type="number"
                            min={1}
                            suffix="Turnos por día"
                            className="w-[220px]"
                            value={draft.dailyLimit}
                            disabled={readOnly}
                            aria-describedby={errors.dailyLimit ? 'service-daily-limit-max-error' : undefined}
                            onChange={(e) => set({ dailyLimit: e.target.value })}
                        />
                        <InlineFieldError id="service-daily-limit-max" error={errors.dailyLimit} />
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
 * solo lectura. Guardar incluye la pestaña Límites. El Dueño además elige quiénes lo atienden, en Empleados. En Horas
 * laborables, cada uno elige con cuál de sus Availability lo atiende, y eso se guarda aparte. Un Servicio personal lo
 * edita todo su Usuario, sin Empleados: su Enlace de reserva cuelga del suyo, y si todavía no lo eligió no hay cómo
 * abrirlo.
 */
export function ServiceDetail({ detail }: { detail: ServiceDetailData }) {
    const { service } = detail;
    const personal = detail.kind === 'personal';
    const linkBase =
        detail.kind === 'business' ? bookingLinkPath(detail.business.slug, detail.branch.slug) : detail.userSlug && userLinkPath(detail.userSlug);
    const publicPath = linkBase && `${linkBase}/${service.slug}`;
    const router = useRouter();
    const saved = editFormOf(service);
    const [draft, setDraft] = useState(saved);
    const [savedKey, setSavedKey] = useState(JSON.stringify(saved));
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, startSaving] = useTransition();
    const [tab, setTab] = useState<TabId>('setup');
    const [confirmRetire, setConfirmRetire] = useState(false);
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
            if ('dailyLimitEnabled' in patch) delete next.dailyLimit;
            return next;
        });
        setFormError(null);
    };

    const save = () => {
        if (!edit.ok) {
            setErrors(edit.errors);
            setTab(Object.keys(edit.errors).every((field) => LIMITS_FIELDS.includes(field)) ? 'limits' : 'setup');
            return;
        }
        startSaving(async () => {
            const saveResult = await updateServiceAction({ id: service.id, ...edit.changes });
            if (saveResult.ok) toast.success(`${saveResult.name}: servicio actualizado`);
            else if (saveResult.field) setErrors((prev) => ({ ...prev, [saveResult.field!]: saveResult.message }));
            else setFormError(saveResult.message);
        });
    };

    const myAvailability = detail.availabilities?.find((a) => a.id === detail.myAvailabilityId);
    const afterStopping = () => (!isOwner && service.hidden ? router.replace('/services') : router.refresh());
    const limitsSummary = [
        service.prepMinutes ? `Preparación ${service.prepMinutes} min` : 'Sin preparación',
        service.dailyLimit !== null && `máx. ${service.dailyLimit}/día`,
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
        {
            id: 'availability',
            icon: Calendar,
            title: 'Horas laborables',
            subtitle: myAvailability?.name ?? 'No lo ofrecés',
        },
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
                        {!personal && service.offeredByMe && (
                            <PanelBadge className="bg-[#e6f6ec] text-[#15803d]">Lo ofrecés</PanelBadge>
                        )}
                    </div>
                    <span className="truncate text-[12.5px] font-medium text-[#6b7280]">
                        {personal ? 'Servicio personal' : `Lo atienden ${NAMES.format(service.employees.map((e) => e.name))}`}
                    </span>
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-3">
                    {isOwner && <HiddenSwitch service={service} page={personal ? 'tu página' : undefined} showLabel />}
                    {detail.kind === 'business' && (
                        <OfferButton service={service} employeeId={detail.employeeId} onStopped={afterStopping} />
                    )}
                    <PanelDivider />
                    <PanelIconGroup>
                        {publicPath && <PublicLinkButtons path={publicPath} />}
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
                    {detail.kind === 'business' && !isOwner && tab !== 'availability' && (
                        <div className="flex items-start gap-2.5 rounded-md bg-[#f3f4f6] px-4 py-3 text-[13px] font-medium text-[#374151]">
                            <Info className="mt-0.5 size-4 shrink-0" />
                            <span>
                                Solo el Dueño de {detail.business.name} puede editar este servicio. Vos elegís en qué horario lo
                                atendés, en Horas laborables.
                            </span>
                        </div>
                    )}
                    {tab === 'setup' && (
                        <SetupTab
                            draft={draft}
                            set={set}
                            errors={errors}
                            slugPrefix={`${linkBase ?? '/u/…'}/`}
                            slugChanged={draft.slug !== saved.slug}
                            readOnly={!isOwner || saving}
                        />
                    )}
                    {tab === 'employees' && detail.staff && (
                        <EmployeesTab service={service} staff={detail.staff} myEmployeeId={detail.employeeId} />
                    )}
                    {tab === 'availability' && <AvailabilityTab detail={detail} onStopped={afterStopping} />}
                    {tab === 'limits' && (
                        <LimitsTab draft={draft} set={set} errors={errors} readOnly={!isOwner || saving} />
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
