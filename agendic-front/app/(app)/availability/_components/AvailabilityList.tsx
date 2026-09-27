'use client';

import { useState } from 'react';
import { Copy, Globe, MoreHorizontal, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
} from '@/app/(app)/_components/panel-ui';
import { BRANCH_TIME_ZONE, summarize, type Availability } from '@/app/(app)/_components/mock-availability';
import { DeleteAvailabilityConfirm } from './DeleteAvailabilityConfirm';

function NewAvailabilityDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
    const [name, setName] = useState('');

    return (
        <PanelDialog
            open
            onOpenChange={(open) => !open && onClose()}
            title="Agregar horas laborables"
            description="Arrancan de lunes a viernes, de 09:00 a 18:00. Después las ajustás."
            footer={
                <>
                    <PanelDialogClose>
                        <PanelButton variant="ghost">Cerrar</PanelButton>
                    </PanelDialogClose>
                    <PanelButton type="submit" form="new-availability" disabled={!name.trim()}>
                        Continuar
                    </PanelButton>
                </>
            }
        >
            <form
                id="new-availability"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (name.trim()) onCreate(name.trim());
                }}
            >
                <PanelField label="Nombre" htmlFor="new-availability-name">
                    <PanelInput
                        id="new-availability-name"
                        autoFocus
                        placeholder="Horario de verano"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </PanelField>
            </form>
        </PanelDialog>
    );
}

function AvailabilityRow({
    availability,
    usedBy,
    onOpen,
    onMakeDefault,
    onDuplicate,
    onDelete,
}: {
    availability: Availability;
    usedBy: number;
    onOpen: () => void;
    onMakeDefault: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const lines = summarize(availability.days);

    return (
        <li className="flex items-center gap-4 px-6 py-5 transition-colors hover:bg-[#f9fafb]">
            <button
                type="button"
                onClick={onOpen}
                className="flex min-w-0 flex-1 flex-col items-start gap-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-[#0f1b2d] focus-visible:ring-offset-4"
            >
                <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-bold tracking-[-0.02em] text-[#0f1b2d]">{availability.name}</span>
                    {availability.isDefault && <PanelBadge className="bg-[#e6f6ec] text-[#15803d]">Predeterminado</PanelBadge>}
                </span>
                <span className="flex flex-col text-[13px] font-medium text-[#6b7280]">
                    {lines.length ? lines.map((line) => <span key={line}>{line}</span>) : <span>Sin Franjas</span>}
                </span>
                <span className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-[#374151]">
                    <Globe className="size-4 text-[#6b7280]" />
                    {BRANCH_TIME_ZONE}
                </span>
            </button>

            <PanelIconGroup>
                <PanelMenu
                    trigger={
                        <PanelIconButton label="Más acciones">
                            <MoreHorizontal />
                        </PanelIconButton>
                    }
                    items={[
                        ...(availability.isDefault ? [] : [{ label: 'Hacer predeterminado', icon: <Star />, onSelect: onMakeDefault }]),
                        { label: 'Duplicar', icon: <Copy />, onSelect: onDuplicate },
                        { label: 'Eliminar', icon: <Trash2 />, destructive: true, onSelect: () => setConfirmDelete(true) },
                    ]}
                />
            </PanelIconGroup>

            <DeleteAvailabilityConfirm
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                availability={availability}
                usedBy={usedBy}
                onConfirm={onDelete}
            />
        </li>
    );
}

export function AvailabilityList({
    availabilities,
    servicesUsing,
    onOpen,
    onCreate,
    onMakeDefault,
    onDuplicate,
    onDelete,
}: {
    availabilities: Availability[];
    /** Cuántos Servicios usan cada Availability. */
    servicesUsing: (id: string) => number;
    onOpen: (id: string) => void;
    onCreate: (name: string) => void;
    onMakeDefault: (id: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const [creating, setCreating] = useState(false);

    return (
        <div className="flex-1 bg-white px-4 py-8 text-[#0f1b2d] sm:px-8">
            <header className="flex flex-wrap items-start gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                    <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">Disponibilidad</h1>
                    <p className="m-0 text-[13px] font-medium text-[#6b7280]">
                        Configurá los horarios en los que estás disponible para recibir reservas.
                    </p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    {/* ponytail: la vista del equipo (el Dueño viendo las Availability de su Staff) todavía no existe. */}
                    <div role="tablist" className="flex rounded-md bg-[#f3f4f6] p-1 text-[13px] font-semibold">
                        <button type="button" role="tab" aria-selected className="rounded bg-white px-3 py-1.5 text-[#0f1b2d] shadow-[0_1px_2px_rgba(15,27,45,0.08)]">
                            Mi disponibilidad
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={false}
                            disabled
                            title="Próximamente"
                            className="cursor-not-allowed rounded px-3 py-1.5 text-[#9ca3af]"
                        >
                            Disponibilidad del equipo
                        </button>
                    </div>
                    <PanelButton onClick={() => setCreating(true)}>
                        <Plus className="size-4" />
                        Nuevo
                    </PanelButton>
                </div>
            </header>

            <div className="mt-8 overflow-hidden rounded-xl border border-[#e5e7eb]">
                <ul className="m-0 list-none divide-y divide-[#e5e7eb] p-0">
                    {availabilities.map((a) => (
                        <AvailabilityRow
                            key={a.id}
                            availability={a}
                            usedBy={servicesUsing(a.id)}
                            onOpen={() => onOpen(a.id)}
                            onMakeDefault={() => onMakeDefault(a.id)}
                            onDuplicate={() => onDuplicate(a.id)}
                            onDelete={() => onDelete(a.id)}
                        />
                    ))}
                </ul>
                <p className="m-0 border-t border-[#e5e7eb] bg-[#f9fafb] px-6 py-3.5 text-center text-[13px] font-medium text-[#6b7280]">
                    ¿Te vas a tomar unos días?{' '}
                    {/* ponytail: los días libres que redirigen tus turnos a otro Empleado llegan en otro ticket. */}
                    <button
                        type="button"
                        onClick={() => toast('Muy pronto vas a poder redirigir tus días libres a otro empleado.')}
                        className="font-semibold text-[#0f1b2d] underline underline-offset-2 hover:text-[#1c2b44]"
                    >
                        Redirigí tus turnos a otro empleado
                    </button>
                </p>
            </div>

            {creating && (
                <NewAvailabilityDialog
                    onClose={() => setCreating(false)}
                    onCreate={(name) => {
                        setCreating(false);
                        onCreate(name);
                    }}
                />
            )}
        </div>
    );
}
