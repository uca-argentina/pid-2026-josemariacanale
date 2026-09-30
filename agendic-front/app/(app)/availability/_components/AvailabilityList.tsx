'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, MoreHorizontal, Plus, Star, Trash2 } from 'lucide-react';
import {
    PanelBadge,
    PanelButton,
    PanelConfirm,
    PanelDialog,
    PanelDialogClose,
    PanelField,
    PanelIconButton,
    PanelIconGroup,
    PanelInput,
    PanelMenu,
    PanelSelect,
} from '@/app/(app)/_components/panel-ui';
import { summarize, toWeek } from '@/app/(app)/_components/availability-week';
import type { AvailabilityItem, StaffMember } from './AvailabilityView';

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
                        Agregar
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
    busy,
    onOpen,
    onMakeDefault,
    onDuplicate,
    onDelete,
}: {
    availability: AvailabilityItem;
    busy: boolean;
    onOpen: () => void;
    onMakeDefault: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const lines = summarize(toWeek(availability.intervals));

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
            </button>

            <PanelIconGroup>
                <PanelMenu
                    trigger={
                        <PanelIconButton label="Más acciones" disabled={busy}>
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

            <PanelConfirm
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title="¿Eliminar estas horas laborables?"
                description={`"${availability.name}" se elimina para siempre.`}
                confirmLabel="Eliminar"
                destructive
                onConfirm={onDelete}
            />
        </li>
    );
}

/**
 * Las Horas laborables del Empleado elegido, con la predeterminada marcada. El selector cambia de
 * Empleado del Staff recargando la página con `?empleado=`.
 */
export function AvailabilityList({
    employees,
    employeeId,
    availabilities,
    busy,
    onOpen,
    onCreate,
    onMakeDefault,
    onDuplicate,
    onDelete,
}: {
    employees: StaffMember[];
    employeeId: number;
    availabilities: AvailabilityItem[];
    busy: boolean;
    onOpen: (id: number) => void;
    onCreate: (name: string) => Promise<boolean>;
    onMakeDefault: (availability: AvailabilityItem) => void;
    onDuplicate: (availability: AvailabilityItem) => void;
    onDelete: (availability: AvailabilityItem) => void;
}) {
    const router = useRouter();
    const [creating, setCreating] = useState(false);

    return (
        <div className="flex-1 bg-white px-4 py-8 text-[#0f1b2d] sm:px-8">
            <header className="flex flex-wrap items-start gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                    <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">Horas laborables</h1>
                    <p className="m-0 text-[13px] font-medium text-[#6b7280]">
                        Los horarios en los que atiende cada Empleado para recibir Turnos.
                    </p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <PanelSelect
                        aria-label="Empleado"
                        value={String(employeeId)}
                        onValueChange={(id) => router.push(`/availability?empleado=${id}`)}
                        options={employees.map((e) => ({ value: String(e.id), label: e.isOwner ? `${e.name} (vos)` : e.name }))}
                        className="w-[220px]"
                    />
                    <PanelButton disabled={busy} onClick={() => setCreating(true)}>
                        <Plus className="size-4" />
                        Nuevo
                    </PanelButton>
                </div>
            </header>

            <div className="mt-8 overflow-hidden rounded-xl border border-[#e5e7eb]">
                {availabilities.length > 0 ? (
                    <ul className="m-0 list-none divide-y divide-[#e5e7eb] p-0">
                        {availabilities.map((a) => (
                            <AvailabilityRow
                                key={a.id}
                                availability={a}
                                busy={busy}
                                onOpen={() => onOpen(a.id)}
                                onMakeDefault={() => onMakeDefault(a)}
                                onDuplicate={() => onDuplicate(a)}
                                onDelete={() => onDelete(a)}
                            />
                        ))}
                    </ul>
                ) : (
                    <p className="m-0 px-6 py-8 text-center text-[13px] font-medium text-[#6b7280]">
                        Este Empleado todavía no tiene horas laborables.
                    </p>
                )}
            </div>

            {creating && (
                <NewAvailabilityDialog
                    onClose={() => setCreating(false)}
                    onCreate={async (name) => {
                        if (await onCreate(name)) setCreating(false);
                    }}
                />
            )}
        </div>
    );
}
