'use client';

import { useState } from 'react';
import { Popover } from 'radix-ui';
import { ArrowLeft, Copy, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/app/_components/utils';
import {
    PanelButton,
    PanelCheckbox,
    PanelConfirm,
    PanelDivider,
    PanelIconButton,
    PanelIconGroup,
    PanelSection,
    PanelSwitch,
} from '@/app/(app)/_components/panel-ui';
import {
    DAY_NAMES,
    DEFAULT_INTERVAL,
    intervalsValid,
    type Availability,
    type AvailabilityInterval,
} from '@/src/entities/models/availability';
import { DeleteAvailabilityConfirm } from './DeleteAvailabilityConfirm';
import { AddIntervalButton, IntervalsEditor } from './IntervalsEditor';

function CopyIntervals({
    fromDay,
    disabled,
    onApply,
}: {
    fromDay: number;
    disabled: boolean;
    onApply: (days: number[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const [picked, setPicked] = useState<number[]>([]);
    const others = DAY_NAMES.map((_, i) => i).filter((i) => i !== fromDay);
    const close = () => {
        setOpen(false);
        setPicked([]);
    };

    return (
        <Popover.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
            <Popover.Trigger asChild>
                <PanelIconButton bordered label="Copiar Franjas a otros días" disabled={disabled}>
                    <Copy />
                </PanelIconButton>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    align="end"
                    sideOffset={4}
                    className="z-50 w-[240px] rounded-md border border-[#e5e7eb] bg-white shadow-[0_10px_30px_rgba(15,27,45,0.12)]"
                >
                    <div className="flex flex-col gap-1 p-3">
                        <span className="px-1 pb-1 text-[11.5px] font-extrabold tracking-[0.04em] text-[#0f1b2d] uppercase">
                            Copiar Franjas a
                        </span>
                        <label className="flex cursor-pointer items-center justify-between rounded px-1 py-1.5 text-[13.5px] font-medium text-[#0f1b2d]">
                            Seleccionar todos
                            <PanelCheckbox
                                checked={picked.length === others.length}
                                onCheckedChange={(on) => setPicked(on === true ? others : [])}
                            />
                        </label>
                        {DAY_NAMES.map((name, day) => (
                            <label
                                key={name}
                                className="flex cursor-pointer items-center justify-between rounded px-1 py-1.5 text-[13.5px] font-medium text-[#0f1b2d] has-[:disabled]:cursor-default"
                            >
                                {name}
                                <PanelCheckbox
                                    checked={day === fromDay || picked.includes(day)}
                                    disabled={day === fromDay}
                                    onCheckedChange={(on) =>
                                        setPicked((p) => (on === true ? [...p, day] : p.filter((d) => d !== day)))
                                    }
                                />
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2 border-t border-[#e5e7eb] px-3 py-3">
                        <PanelButton variant="ghost" onClick={close}>
                            Cancelar
                        </PanelButton>
                        <PanelButton
                            disabled={picked.length === 0}
                            onClick={() => {
                                onApply(picked);
                                close();
                            }}
                        >
                            Aplicar
                        </PanelButton>
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

function DayRow({
    day,
    intervals,
    onChange,
    onCopy,
}: {
    day: number;
    intervals: AvailabilityInterval[];
    onChange: (intervals: AvailabilityInterval[]) => void;
    onCopy: (days: number[]) => void;
}) {
    const id = `day-${day}`;

    return (
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3 px-6 py-3">
            <div className="flex h-9 w-[140px] shrink-0 items-center gap-3">
                <PanelSwitch
                    id={id}
                    checked={intervals.length > 0}
                    onCheckedChange={(on) => onChange(on ? [DEFAULT_INTERVAL] : [])}
                />
                <label htmlFor={id} className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#0f1b2d]">
                    {DAY_NAMES[day]}
                </label>
            </div>
            <div className="min-w-0 flex-1">
                {intervals.length > 0 ? (
                    <IntervalsEditor intervals={intervals} onChange={onChange} />
                ) : (
                    <span className="flex h-9 items-center text-[13.5px] font-medium text-[#6b7280]">No disponible</span>
                )}
            </div>
            <div className="flex h-9 items-center gap-2">
                <AddIntervalButton intervals={intervals} onChange={onChange} />
                <CopyIntervals fromDay={day} disabled={intervals.length === 0} onApply={onCopy} />
            </div>
        </div>
    );
}

function NameField({ name, onChange }: { name: string; onChange: (name: string) => void }) {
    const [editing, setEditing] = useState(false);

    if (editing) {
        return (
            <input
                autoFocus
                aria-label="Nombre"
                value={name}
                onChange={(e) => onChange(e.target.value)}
                onBlur={() => setEditing(false)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="m-0 min-w-0 rounded-md border border-[#d1d5db] px-2 py-0.5 text-[21px] font-extrabold tracking-[-0.035em] outline-none focus:border-[#0f1b2d] focus:ring-1 focus:ring-[#0f1b2d]"
            />
        );
    }

    return (
        <div className="flex min-w-0 items-center gap-2">
            <h1 className={cn('m-0 truncate text-[21px] font-extrabold tracking-[-0.035em]', !name.trim() && 'text-[#b91c1c]')}>
                {name.trim() ? name : 'Poné un nombre para guardar'}
            </h1>
            <button
                type="button"
                aria-label="Editar nombre"
                onClick={() => setEditing(true)}
                className="rounded-md p-1 text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#0f1b2d]"
            >
                <Pencil className="size-4" />
            </button>
        </div>
    );
}

export function AvailabilityEditor({
    availability,
    usedBy,
    onBack,
    onSave,
    onDelete,
}: {
    availability: Availability;
    /** Cuántos Servicios la usan: si alguno, no se puede eliminar. */
    usedBy: number;
    onBack: () => void;
    onSave: (availability: Availability) => void;
    onDelete: () => void;
}) {
    const [saved, setSaved] = useState(availability);
    const [draft, setDraft] = useState(availability);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
    const valid = draft.name.trim() !== '' && draft.days.every(intervalsValid);

    const setDay = (day: number, intervals: AvailabilityInterval[]) =>
        setDraft((d) => ({ ...d, days: d.days.map((current, i) => (i === day ? intervals : current)) }));

    const save = () => {
        const next = { ...draft, name: draft.name.trim() };
        onSave(next);
        setSaved(next);
        setDraft(next);
        toast.success(`${next.name}: horas laborables actualizadas`);
    };

    return (
        <div className="flex-1 bg-white px-4 py-6 text-[#0f1b2d] sm:px-8">
            <header className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={() => (dirty ? setConfirmLeave(true) : onBack())}
                    aria-label="Volver a Disponibilidad"
                    className="rounded-md p-1.5 text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#0f1b2d]"
                >
                    <ArrowLeft className="size-5" />
                </button>
                <NameField name={draft.name} onChange={(name) => setDraft((d) => ({ ...d, name }))} />

                <div className="ml-auto flex items-center gap-3">
                    <label htmlFor="availability-default" className="text-[13px] font-semibold">
                        Establecer como predeterminado
                    </label>
                    <PanelSwitch
                        id="availability-default"
                        checked={draft.isDefault}
                        disabled={saved.isDefault}
                        onCheckedChange={(isDefault) => setDraft((d) => ({ ...d, isDefault }))}
                    />
                    <PanelDivider />
                    <PanelIconGroup>
                        <PanelIconButton label="Eliminar" destructive onClick={() => setConfirmDelete(true)}>
                            <Trash2 />
                        </PanelIconButton>
                    </PanelIconGroup>
                    <PanelDivider />
                    <PanelButton disabled={!dirty || !valid} onClick={save}>
                        Guardar
                    </PanelButton>
                </div>
            </header>

            <div className="mt-8 flex max-w-[1080px] flex-col gap-6">
                <PanelSection title="Horas semanales" description="Establecé los horarios en los que atendés cada día.">
                    <div className="divide-y divide-[#e5e7eb]">
                        {draft.days.map((intervals, day) => (
                            <DayRow
                                key={DAY_NAMES[day]}
                                day={day}
                                intervals={intervals}
                                onChange={(next) => setDay(day, next)}
                                onCopy={(days) =>
                                    setDraft((d) => ({ ...d, days: d.days.map((current, i) => (days.includes(i) ? intervals : current)) }))
                                }
                            />
                        ))}
                    </div>
                </PanelSection>
            </div>

            <PanelConfirm
                open={confirmLeave}
                onOpenChange={setConfirmLeave}
                title="¿Descartar los cambios?"
                description="Tenés cambios sin guardar en estas horas laborables."
                confirmLabel="Descartar"
                cancelLabel="Seguir editando"
                destructive
                onConfirm={onBack}
            />
            <DeleteAvailabilityConfirm
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                availability={saved}
                usedBy={usedBy}
                onConfirm={onDelete}
            />
        </div>
    );
}
