'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Copy, Loader2, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { fieldErrorsOf, type FieldErrors } from '@/app/_components/business-schemas';
import { cn } from '@/app/_components/utils';
import {
    PanelAvatar,
    PanelBadge,
    PanelButton,
    PanelDialog,
    PanelDialogClose,
    PanelField,
    PanelIconButton,
    PanelIconGroup,
    PanelInput,
    PanelMenu,
    PanelSelect,
    PanelTextarea,
} from '@/app/(app)/_components/panel-ui';
import { BUSINESS_PATH, bookingLinkPath } from '@/app/routes';
import { createServiceAction } from '../actions';
import { formatPrice } from './format';
import { HiddenSwitch, OfferButton, PublicLinkButtons, RetireServiceConfirm } from './service-actions';
import {
    CATEGORY_OPTIONS,
    copySlug,
    serviceFormSchema,
    slugFrom,
    slugWhileTyping,
    type ServiceForm,
} from './service-form';
import type { ServiceBranch, ServiceGroup, ServiceItem } from './types';

/** Un diálogo de alta abierto: Nuevo arranca vacío; Duplicar, con los datos del Servicio copiado. */
interface DialogState {
    group: ServiceGroup;
    initial: ServiceForm;
}

/** El alta vacía. Con una sola Sucursal no se pregunta: el Servicio va ahí. */
const emptyForm = (group: ServiceGroup): ServiceForm => ({
    branchId: group.branches.length === 1 ? String(group.branches[0].id) : '',
    name: '',
    slug: '',
    slugEdited: false,
    description: '',
    category: '',
    durationMinutes: '15',
    price: '',
});

const copyForm = (service: ServiceItem): ServiceForm => ({
    branchId: String(service.branchId),
    name: `${service.name} (copia)`,
    slug: copySlug(service.slug),
    slugEdited: true,
    description: service.description ?? '',
    category: service.category,
    durationMinutes: String(service.durationMinutes),
    price: String(service.price),
});

function ServiceRow({
    group,
    branch,
    service,
    onDuplicate,
    onRetire,
}: {
    group: ServiceGroup;
    branch: ServiceBranch;
    service: ServiceItem;
    onDuplicate: () => void;
    onRetire: () => void;
}) {
    const isOwner = group.role === 'owner';
    const path = bookingLinkPath(group.business.slug, branch.slug, service.slug);
    const router = useRouter();

    return (
        <li className="flex flex-wrap items-center gap-4 px-6 py-5 transition-colors hover:bg-[#f9fafb]">
            <Link
                href={`/services/${service.id}`}
                className="min-w-0 flex-1 basis-[320px] rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#0f1b2d] focus-visible:ring-offset-4"
            >
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-[14.5px] font-bold tracking-[-0.02em] text-[#0f1b2d]">{service.name}</span>
                    <small className="text-[12.5px] font-medium text-[#6b7280]">/{service.slug}</small>
                </div>
                {service.description && (
                    <p className="m-0 mt-1 line-clamp-4 max-w-[680px] text-[13px] font-medium leading-relaxed text-[#6b7280]">
                        {service.description}
                    </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                    <PanelBadge>
                        <Clock />
                        {service.durationMinutes}m
                    </PanelBadge>
                    <PanelBadge>{formatPrice(service.price)}</PanelBadge>
                </div>
            </Link>

            <div className="ml-auto flex items-center gap-4">
                {service.offeredByMe && <PanelBadge className="bg-[#e6f6ec] text-[#15803d]">Lo ofrecés</PanelBadge>}
                {service.hidden && <PanelBadge>Oculto</PanelBadge>}
                <OfferButton service={service} employeeId={group.employeeId} onStopped={() => router.refresh()} />
                {isOwner && <HiddenSwitch service={service} />}
                <PanelIconGroup>
                    <PublicLinkButtons path={path} />
                    {isOwner && (
                        <PanelMenu
                            trigger={
                                <PanelIconButton label="Más acciones">
                                    <MoreHorizontal />
                                </PanelIconButton>
                            }
                            items={[
                                { label: 'Duplicar', icon: <Copy />, onSelect: onDuplicate },
                                { label: 'Dar de baja', icon: <Trash2 />, destructive: true, onSelect: onRetire },
                            ]}
                        />
                    )}
                </PanelIconGroup>
            </div>
        </li>
    );
}

function GroupHeader({ group, onNew }: { group: ServiceGroup; onNew: () => void }) {
    return (
        <div className="mb-3 flex items-center gap-3">
            <PanelAvatar name={group.business.name} />
            <div className="flex min-w-0 flex-col">
                <span className="text-[14.5px] font-bold tracking-[-0.02em] text-[#0f1b2d]">{group.business.name}</span>
                <span className="text-[12.5px] font-medium text-[#6b7280]">{bookingLinkPath(group.business.slug)}</span>
            </div>
            <PanelBadge className="ml-1">{group.role === 'owner' ? 'Dueño' : 'Empleado'}</PanelBadge>
            {group.role === 'owner' && group.branches.length > 0 && (
                <PanelButton className="ml-auto" onClick={onNew}>
                    <Plus className="size-4" />
                    Nuevo
                </PanelButton>
            )}
        </div>
    );
}

function NewServiceDialog({ state, onClose }: { state: DialogState; onClose: () => void }) {
    const { group } = state;
    const [form, setForm] = useState(state.initial);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, startSaving] = useTransition();
    const branch = group.branches.find((b) => String(b.id) === form.branchId);

    const set = (patch: Partial<ServiceForm>) => {
        setForm((f) => ({ ...f, ...patch }));
        setErrors((e) => {
            const next = { ...e };
            for (const field of Object.keys(patch)) delete next[field];
            return next;
        });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = serviceFormSchema.safeParse(form);
        if (!parsed.success) {
            setErrors(fieldErrorsOf(parsed.error));
            return;
        }
        setFormError(null);
        startSaving(async () => {
            const result = await createServiceAction({ ...parsed.data, employeeIds: [group.employeeId] });
            if (result.ok) {
                toast.success(`${result.name}: servicio creado`);
                onClose();
            } else if (result.field) setErrors((prev) => ({ ...prev, [result.field!]: result.message }));
            else setFormError(result.message);
        });
    };

    return (
        <PanelDialog
            open
            onOpenChange={(open) => !open && !saving && onClose()}
            title="Agregar un nuevo servicio"
            description="Creá un servicio para que tus clientes reserven turnos."
            footer={
                <>
                    <PanelDialogClose>
                        <PanelButton variant="ghost" disabled={saving}>
                            Cerrar
                        </PanelButton>
                    </PanelDialogClose>
                    <PanelButton type="submit" form="new-service" disabled={saving} className="min-w-[104px]">
                        {saving ? <Loader2 className="size-4 animate-spin" /> : 'Continuar'}
                    </PanelButton>
                </>
            }
        >
            <form id="new-service" onSubmit={submit} noValidate className="flex flex-col gap-5">
                {group.branches.length > 1 && (
                    <PanelField label="Sucursal" htmlFor="new-service-branch" error={errors.branchId}>
                        <PanelSelect
                            id="new-service-branch"
                            value={form.branchId}
                            onValueChange={(branchId) => set({ branchId })}
                            options={group.branches.map((b) => ({ value: String(b.id), label: b.name }))}
                            placeholder="Elegí una sucursal"
                        />
                    </PanelField>
                )}
                <PanelField label="Título" htmlFor="new-service-name" error={errors.name}>
                    <PanelInput
                        id="new-service-name"
                        placeholder="Consulta inicial"
                        value={form.name}
                        onChange={(e) =>
                            set({ name: e.target.value, ...(form.slugEdited ? {} : { slug: slugFrom(e.target.value) }) })
                        }
                    />
                </PanelField>
                <PanelField label="Enlace de reserva" htmlFor="new-service-slug" error={errors.slug}>
                    <PanelInput
                        id="new-service-slug"
                        prefix={`${bookingLinkPath(group.business.slug, branch?.slug ?? '…')}/`}
                        value={form.slug}
                        aria-describedby={errors.slug ? 'new-service-slug-error' : undefined}
                        onChange={(e) => set({ slug: slugWhileTyping(e.target.value), slugEdited: true })}
                    />
                </PanelField>
                <PanelField label="Descripción" htmlFor="new-service-description" error={errors.description}>
                    <PanelTextarea
                        id="new-service-description"
                        placeholder="Una primera evaluación para armar tu plan."
                        value={form.description}
                        onChange={(e) => set({ description: e.target.value })}
                    />
                </PanelField>
                <PanelField label="Categoría de Servicio" htmlFor="new-service-category" error={errors.category}>
                    <PanelSelect
                        id="new-service-category"
                        value={form.category}
                        onValueChange={(category) => set({ category: category as ServiceForm['category'] })}
                        options={CATEGORY_OPTIONS}
                        placeholder="Elegí una categoría"
                    />
                </PanelField>
                <PanelField label="Duración" htmlFor="new-service-duration" error={errors.durationMinutes}>
                    <PanelInput
                        id="new-service-duration"
                        type="number"
                        min={1}
                        suffix="Minutos"
                        value={form.durationMinutes}
                        onChange={(e) => set({ durationMinutes: e.target.value })}
                    />
                </PanelField>
                <PanelField label="Precio" htmlFor="new-service-price" error={errors.price}>
                    <PanelInput
                        id="new-service-price"
                        type="number"
                        min={0}
                        prefix="$"
                        suffix="ARS"
                        placeholder="0"
                        value={form.price}
                        onChange={(e) => set({ price: e.target.value })}
                    />
                </PanelField>
                {formError && (
                    <p role="alert" className="m-0 text-[12.5px] font-medium text-[#b91c1c]">
                        {formError}
                    </p>
                )}
            </form>
        </PanelDialog>
    );
}

/** El catálogo del panel: un grupo por Negocio, sus Servicios agrupados por Sucursal en el orden en que llegan. */
export function ServicesList({ groups }: { groups: ServiceGroup[] }) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [dialog, setDialog] = useState<DialogState | null>(null);
    const [retiring, setRetiring] = useState<ServiceItem | null>(null);

    const q = query.trim().toLowerCase();
    const shownGroups = groups
        .map((g) => ({
            ...g,
            branches: g.branches
                .map((b) => ({ ...b, services: b.services.filter((s) => s.name.toLowerCase().includes(q)) }))
                .filter((b) => !q || b.services.length > 0),
        }))
        .filter((g) => !q || g.branches.length > 0);

    return (
        <div className="flex-1 bg-white px-4 py-8 text-[#0f1b2d] sm:px-8">
            <header className="flex min-w-0 flex-col gap-1">
                <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">Servicios</h1>
                <p className="m-0 text-[13px] font-medium text-[#6b7280]">Creá servicios para que tus clientes reserven en tu agenda.</p>
            </header>

            {groups.length === 0 ? (
                <div className="mt-16 flex flex-col items-center gap-3 text-center">
                    <p className="m-0 text-[14.5px] font-bold text-[#0f1b2d]">Todavía no atendés en ningún Negocio</p>
                    <p className="m-0 max-w-[420px] text-[13px] font-medium text-[#6b7280]">
                        Creá tu Negocio, o aceptá la invitación de un Negocio para atender sus Servicios.
                    </p>
                    <PanelButton onClick={() => router.push(BUSINESS_PATH)}>Ir a Mi Negocio</PanelButton>
                </div>
            ) : (
                <>
                    <div className="mt-8 flex h-9 w-full max-w-[320px] items-center gap-2 rounded-md border border-[#d1d5db] px-3 focus-within:border-[#0f1b2d] focus-within:ring-1 focus-within:ring-[#0f1b2d]">
                        <Search className="size-4 shrink-0 text-[#6b7280]" />
                        <input
                            aria-label="Buscar servicios"
                            placeholder="Buscar"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] font-medium outline-none placeholder:text-[#9ca3af]"
                        />
                    </div>

                    <div className="mt-6 flex flex-col gap-10">
                        {shownGroups.map((group) => (
                            <section key={group.business.id}>
                                <GroupHeader group={group} onNew={() => setDialog({ group, initial: emptyForm(group) })} />
                                <div className="flex flex-col gap-5">
                                    {group.branches.map((branch) => (
                                        <div key={branch.id}>
                                            <h3 className="m-0 mb-2 text-[12px] font-extrabold tracking-[0.02em] text-[#6b7280] uppercase">
                                                {branch.name}
                                            </h3>
                                            {branch.services.length > 0 ? (
                                                <ul className="m-0 list-none divide-y divide-[#e5e7eb] overflow-hidden rounded-md border border-[#e5e7eb] p-0">
                                                    {branch.services.map((service) => (
                                                        <ServiceRow
                                                            key={service.id}
                                                            group={group}
                                                            branch={branch}
                                                            service={service}
                                                            onDuplicate={() => setDialog({ group, initial: copyForm(service) })}
                                                            onRetire={() => setRetiring(service)}
                                                        />
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="m-0 rounded-md border border-dashed border-[#e5e7eb] px-6 py-5 text-[13px] font-medium text-[#9ca3af]">
                                                    Esta sucursal todavía no tiene servicios.
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>

                    <p className={cn('mt-6 text-center text-[13px] font-medium text-[#9ca3af]', shownGroups.length === 0 && 'mt-16')}>
                        {shownGroups.length === 0 ? 'No hay servicios que coincidan con la búsqueda' : 'No hay más resultados'}
                    </p>
                </>
            )}

            {retiring && (
                <RetireServiceConfirm
                    service={retiring}
                    open
                    onOpenChange={(open) => !open && setRetiring(null)}
                    onRetired={() => router.refresh()}
                />
            )}
            {dialog && <NewServiceDialog key={dialog.initial.slug + dialog.group.business.id} state={dialog} onClose={() => setDialog(null)} />}
        </div>
    );
}
