'use client';

import { useState } from 'react';
import { MoreHorizontal, Plus, Star, Trash2 } from 'lucide-react';
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
} from '@/app/(app)/_components/panel-ui';
import type { Availability } from '@/src/entities/models/availability';
import { TimeZoneSelect } from './TimeZoneSelect';

function NewAvailabilityDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, timeZone: string) => void }) {
    const [name, setName] = useState('');
    const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

    return (
        <PanelDialog
            open
            onOpenChange={(open) => !open && onClose()}
            title="Agregar horas laborables"
            description="Después cargás las Franjas de cada día."
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
                    if (name.trim()) onCreate(name.trim(), timeZone);
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
                <PanelField label="Zona horaria" htmlFor="new-availability-time-zone">
                    <TimeZoneSelect id="new-availability-time-zone" value={timeZone} onChange={setTimeZone} />
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
    onDelete,
}: {
    availability: Availability;
    busy: boolean;
    onOpen: () => void;
    onMakeDefault: () => void;
    onDelete: () => void;
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);

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
                <span className="text-[13px] font-medium text-[#6b7280]">{availability.timeZone}</span>
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
 * Las Horas laborables del Usuario con su zona horaria y la predeterminada marcada; abrir una lleva a su
 * editor.
 */
export function AvailabilityList({
    availabilities,
    busy,
    onOpen,
    onCreate,
    onMakeDefault,
    onDelete,
}: {
    availabilities: Availability[];
    busy: boolean;
    onOpen: (id: number) => void;
    onCreate: (name: string, timeZone: string) => Promise<boolean>;
    onMakeDefault: (availability: Availability) => void;
    onDelete: (availability: Availability) => void;
}) {
    const [creating, setCreating] = useState(false);

    return (
        <div className="flex-1 bg-white px-4 py-8 text-[#0f1b2d] sm:px-8">
            <header className="flex flex-wrap items-start gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                    <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">Horas laborables</h1>
                    <p className="m-0 text-[13px] font-medium text-[#6b7280]">
                        Los horarios en los que atendés para recibir Turnos.
                    </p>
                </div>
                <div className="ml-auto flex items-center gap-3">
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
                                onDelete={() => onDelete(a)}
                            />
                        ))}
                    </ul>
                ) : (
                    <p className="m-0 px-6 py-8 text-center text-[13px] font-medium text-[#6b7280]">
                        Todavía no tenés horas laborables.
                    </p>
                )}
            </div>

            {creating && (
                <NewAvailabilityDialog
                    onClose={() => setCreating(false)}
                    onCreate={async (name, timeZone) => {
                        if (await onCreate(name, timeZone)) setCreating(false);
                    }}
                />
            )}
        </div>
    );
}
