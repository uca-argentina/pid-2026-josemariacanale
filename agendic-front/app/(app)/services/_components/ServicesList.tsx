'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, Copy, Loader2, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { slugify } from '@/app/onboarding/_components/schemas';
import { cn } from '@/app/_components/utils';
import {
    PanelBadge,
    PanelButton,
    PanelDialog,
    PanelDialogClose,
    PanelField,
    PanelIconButton,
    PanelIconGroup,
    PanelInput,
    PanelMenu,
    PanelSwitch,
    PanelTextarea,
} from '@/app/(app)/_components/panel-ui';
import { OfferButton, PublicLinkButtons } from './service-actions';
import { bookingLink, formatPrice, publicUrl, type ServiceGroup, type ServiceItem } from '@/app/(app)/_components/mock-services';

const initials = (name: string) =>
    name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

function ServiceRow({
    group,
    service,
    linkable,
    onToggleVisible,
}: {
    group: ServiceGroup;
    service: ServiceItem;
    linkable: boolean;
    onToggleVisible: (visible: boolean) => void;
}) {
    const isOwner = group.role === 'owner';
    const body = (
        <>
            <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-[14.5px] font-bold tracking-[-0.02em] text-[#0f1b2d]">{service.name}</span>
                <small className="text-[12.5px] font-medium text-[#6b7280]">
                    /{group.business.slug}/{service.slug}
                </small>
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
        </>
    );

    return (
        <li className="flex flex-wrap items-center gap-4 px-6 py-5 transition-colors hover:bg-[#f9fafb]">
            {/* Recién creados en el cliente: todavía no tienen página de detalle. */}
            {linkable ? (
                <Link href={`/services/${service.id}`} className="min-w-0 flex-1 basis-[320px] rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#0f1b2d] focus-visible:ring-offset-4">
                    {body}
                </Link>
            ) : (
                <div className="min-w-0 flex-1 basis-[320px]">{body}</div>
            )}

            <div className="ml-auto flex items-center gap-4">
                {service.offeredByMe && <PanelBadge className="bg-[#e6f6ec] text-[#15803d]">Lo ofrecés</PanelBadge>}
                {isOwner && !service.visible && <PanelBadge>Oculto</PanelBadge>}
                <OfferButton service={service} />
                {isOwner && (
                    <PanelSwitch
                        checked={service.visible}
                        onCheckedChange={onToggleVisible}
                        aria-label={service.visible ? 'Ocultar del Enlace de reserva' : 'Mostrar en el Enlace de reserva'}
                    />
                )}
                <PanelIconGroup>
                    <PublicLinkButtons url={publicUrl(group.business.slug, service.slug)} />
                    <PanelMenu
                        trigger={
                            <PanelIconButton label="Más acciones">
                                <MoreHorizontal />
                            </PanelIconButton>
                        }
                        items={[
                            { label: 'Duplicar', icon: <Copy />, disabled: true },
                            ...(isOwner ? [{ label: 'Dar de baja', icon: <Trash2 />, destructive: true, disabled: true }] : []),
                        ]}
                    />
                </PanelIconGroup>
            </div>
        </li>
    );
}

function GroupHeader({ group }: { group: ServiceGroup }) {
    return (
        <div className="mb-3 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#0f1b2d] text-[12px] font-extrabold text-white">
                {initials(group.business.name)}
            </span>
            <div className="flex min-w-0 flex-col">
                <span className="text-[14.5px] font-bold tracking-[-0.02em] text-[#0f1b2d]">{group.business.name}</span>
                <span className="text-[12.5px] font-medium text-[#6b7280]">
                    {bookingLink(group.business.slug)}
                </span>
            </div>
            <PanelBadge className="ml-1">{group.role === 'owner' ? 'Dueño' : 'Empleado'}</PanelBadge>
        </div>
    );
}

const EMPTY_FORM = { name: '', slug: '', slugEdited: false, description: '', duration: '15', price: '' };

function NewServiceDialog({
    open,
    onOpenChange,
    group,
    onCreate,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    group: ServiceGroup;
    onCreate: (service: ServiceItem) => void;
}) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const valid = form.name.trim() && form.slug && Number(form.duration) > 0 && form.price !== '' && Number(form.price) >= 0;

    const close = (next: boolean) => {
        if (saving) return;
        if (!next) setForm(EMPTY_FORM);
        onOpenChange(next);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!valid) return;
        setSaving(true);
        // ponytail: simula la latencia del back; se reemplaza por la server action.
        await new Promise((r) => setTimeout(r, 600));
        onCreate({
            id: crypto.randomUUID(),
            slug: form.slug,
            name: form.name.trim(),
            description: form.description.trim(),
            durationMinutes: Number(form.duration),
            price: Number(form.price),
            visible: true,
            offeredByMe: false,
            otherEmployees: [],
            deposit: { enabled: false, percent: 20 },
            prepMinutes: 0,
            dailyLimit: { enabled: false, max: 8 },
            availabilityId: 'laboral',
        });
        toast.success(`${form.name.trim()}: servicio creado`);
        setSaving(false);
        setForm(EMPTY_FORM);
        onOpenChange(false);
    };

    return (
        <PanelDialog
            open={open}
            onOpenChange={close}
            title="Agregar un nuevo servicio"
            description="Creá un servicio para que tus clientes reserven turnos."
            footer={
                <>
                    <PanelDialogClose>
                        <PanelButton variant="ghost">Cerrar</PanelButton>
                    </PanelDialogClose>
                    <PanelButton type="submit" form="new-service" disabled={!valid || saving} className="min-w-[104px]">
                        {saving ? <Loader2 className="size-4 animate-spin" /> : 'Continuar'}
                    </PanelButton>
                </>
            }
        >
            <form id="new-service" onSubmit={submit} className="flex flex-col gap-5">
                <PanelField label="Título" htmlFor="new-service-name">
                    <PanelInput
                        id="new-service-name"
                        placeholder="Consulta inicial"
                        value={form.name}
                        onChange={(e) =>
                            setForm((f) => ({
                                ...f,
                                name: e.target.value,
                                slug: f.slugEdited ? f.slug : slugify(e.target.value),
                            }))
                        }
                    />
                </PanelField>
                <PanelField label="URL" htmlFor="new-service-slug">
                    <PanelInput
                        id="new-service-slug"
                        prefix={`https://${bookingLink(group.business.slug)}/`}
                        value={form.slug}
                        onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value), slugEdited: true }))}
                    />
                </PanelField>
                <PanelField label="Descripción" htmlFor="new-service-description">
                    <PanelTextarea
                        id="new-service-description"
                        placeholder="Una primera evaluación para armar tu plan."
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                </PanelField>
                <PanelField label="Duración" htmlFor="new-service-duration">
                    <PanelInput
                        id="new-service-duration"
                        type="number"
                        min={1}
                        suffix="Minutos"
                        value={form.duration}
                        onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                    />
                </PanelField>
                <PanelField label="Precio" htmlFor="new-service-price">
                    <PanelInput
                        id="new-service-price"
                        type="number"
                        min={0}
                        prefix="$"
                        suffix="ARS"
                        placeholder="0"
                        value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    />
                </PanelField>
            </form>
        </PanelDialog>
    );
}

export function ServicesList({ initialGroups }: { initialGroups: ServiceGroup[] }) {
    const [groups, setGroups] = useState(initialGroups);
    const [created, setCreated] = useState<Set<string>>(() => new Set());
    const [query, setQuery] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);

    // ponytail: el mock tiene un solo Negocio propio. Con más de uno, "Nuevo" pasa a ser un menú para elegirlo.
    const ownGroup = groups.find((g) => g.role === 'owner');
    const q = query.trim().toLowerCase();
    const visibleGroups = groups
        .map((g) => ({ ...g, services: g.services.filter((s) => s.name.toLowerCase().includes(q)) }))
        .filter((g) => g.services.length > 0);

    const updateService = (businessId: number, serviceId: string, patch: Partial<ServiceItem>) =>
        setGroups((prev) =>
            prev.map((g) =>
                g.business.id !== businessId
                    ? g
                    : { ...g, services: g.services.map((s) => (s.id === serviceId ? { ...s, ...patch } : s)) },
            ),
        );

    const addService = (service: ServiceItem) => {
        if (!ownGroup) return;
        setCreated((prev) => new Set(prev).add(service.id));
        setGroups((prev) =>
            prev.map((g) => (g.business.id === ownGroup.business.id ? { ...g, services: [service, ...g.services] } : g)),
        );
    };

    return (
        <div className="flex-1 bg-white px-4 py-8 text-[#0f1b2d] sm:px-8">
            <header className="flex flex-wrap items-start gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                    <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">Servicios</h1>
                    <p className="m-0 text-[13px] font-medium text-[#6b7280]">Creá servicios para que tus clientes reserven en tu agenda.</p>
                </div>
                {ownGroup && (
                    <PanelButton className="ml-auto" onClick={() => setDialogOpen(true)}>
                        <Plus className="size-4" />
                        Nuevo
                    </PanelButton>
                )}
            </header>

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
                {visibleGroups.map((group) => (
                    <section key={group.business.id}>
                        <GroupHeader group={group} />
                        <ul className="m-0 list-none divide-y divide-[#e5e7eb] overflow-hidden rounded-md border border-[#e5e7eb] p-0">
                            {group.services.map((service) => (
                                <ServiceRow
                                    key={service.id}
                                    group={group}
                                    service={service}
                                    linkable={!created.has(service.id)}
                                    onToggleVisible={(visible) => {
                                        updateService(group.business.id, service.id, { visible });
                                        toast.success(`${service.name}: ${visible ? 'visible' : 'oculto'} en tu Enlace de reserva`);
                                    }}
                                />
                            ))}
                        </ul>
                    </section>
                ))}
            </div>

            <p className={cn('mt-6 text-center text-[13px] font-medium text-[#9ca3af]', visibleGroups.length === 0 && 'mt-16')}>
                {visibleGroups.length === 0 ? 'No hay servicios que coincidan con la búsqueda' : 'No hay más resultados'}
            </p>

            {ownGroup && (
                <NewServiceDialog open={dialogOpen} onOpenChange={setDialogOpen} group={ownGroup} onCreate={addService} />
            )}
        </div>
    );
}
