'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/app/_components/utils';
import {
    PanelButton,
    PanelDialog,
    PanelDialogClose,
    PanelIconButton,
    PanelInput,
    PanelSection,
    PanelSwitch,
} from '@/app/(app)/_components/panel-ui';
import { Employee } from '@/src/entities/models/employee';
import { type EmployeeOverride, type EmployeeOverrideInterval } from '@/src/entities/models/employee-override';
import {
    DAY_SHORT,
    DEFAULT_INTERVAL,
    formatIntervals,
    intervalsValid,
    type AvailabilityInterval,
} from '@/src/entities/models/availability';
import { AddIntervalButton, IntervalsEditor } from './IntervalsEditor';

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const LONG_DATE = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const MONTH = new Intl.DateTimeFormat('es-AR', { month: 'long' });

/** `'2026-10-12'` → `'lunes, 12 de octubre'`. */
const formatDate = (date: string) => LONG_DATE.format(new Date(`${date}T00:00:00Z`));

function Calendar({
    selected,
    initialDate,
    onToggle,
    isTaken,
}: {
    selected: string[];
    /** Fecha (`YYYY-MM-DD`) cuyo mes se muestra al abrir; si no, el mes actual. */
    initialDate?: string;
    onToggle: (date: string) => void;
    isTaken: (date: string) => boolean;
}) {
    const now = new Date();
    const today = isoDate(now.getFullYear(), now.getMonth(), now.getDate());
    const [view, setView] = useState(() =>
        initialDate
            ? { y: Number(initialDate.slice(0, 4)), m: Number(initialDate.slice(5, 7)) - 1 }
            : { y: now.getFullYear(), m: now.getMonth() },
    );
    // No se anula el pasado: no hay por qué ir antes del mes actual (aunque se esté editando una fecha vieja).
    const atOrBeforeThisMonth = view.y * 12 + view.m <= now.getFullYear() * 12 + now.getMonth();
    const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // lunes primero
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const month = MONTH.format(new Date(view.y, view.m, 1));
    const move = (delta: number) =>
        setView(({ y, m }) => {
            const d = new Date(y, m + delta, 1);
            return { y: d.getFullYear(), m: d.getMonth() };
        });

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center">
                <span className="text-[15px] font-extrabold tracking-[-0.02em] text-[#0f1b2d]">
                    {month[0].toUpperCase() + month.slice(1)} <span className="font-medium text-[#6b7280]">{view.y}</span>
                </span>
                <div className="ml-auto flex gap-1">
                    <PanelIconButton label="Mes anterior" className="rounded-md" disabled={atOrBeforeThisMonth} onClick={() => move(-1)}>
                        <ChevronLeft />
                    </PanelIconButton>
                    <PanelIconButton label="Mes siguiente" className="rounded-md" onClick={() => move(1)}>
                        <ChevronRight />
                    </PanelIconButton>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {DAY_SHORT.map((d) => (
                    <span key={d} className="pb-2 text-[11.5px] font-bold tracking-[0.04em] text-[#374151] uppercase">
                        {d}
                    </span>
                ))}
                {Array.from({ length: offset }, (_, i) => (
                    <span key={`blank-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const date = isoDate(view.y, view.m, i + 1);
                    const disabled = isTaken(date) || date < today;
                    const on = selected.includes(date);
                    return (
                        <button
                            key={date}
                            type="button"
                            disabled={disabled}
                            aria-pressed={on}
                            aria-label={formatDate(date)}
                            onClick={() => onToggle(date)}
                            className={cn(
                                'relative flex aspect-square items-center justify-center rounded-md text-[14px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0f1b2d]',
                                disabled
                                    ? 'cursor-not-allowed font-medium text-[#9ca3af]'
                                    : on
                                      ? 'bg-[#0f1b2d] text-white'
                                      : 'bg-[#f3f4f6] text-[#0f1b2d] hover:bg-[#e5e7eb]',
                            )}
                        >
                            {i + 1}
                            {date === today && (
                                <span className={cn('absolute bottom-1.5 size-1 rounded-full', on ? 'bg-white' : 'bg-[#0f1b2d]')} />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function OverrideDialog({
    editing,
    taken,
    employees,
    onClose,
    onSave,
}: {
    /** La Anulación que se edita; sin ella, se crea una. */
    editing?: EmployeeOverride;
    /** Fechas que ya tienen una Anulación. */
    taken: string[];
    employees: Employee[];
    onClose: () => void;
    onSave: (dates: string[], intervals: AvailabilityInterval[], coveredByEmployeeId?: number) => Promise<boolean>;
}) {
    const [selected, setSelected] = useState<string[]>(editing ? [editing.date] : []);
    const [coveredByEmployeeId, setCoveredByEmployeeId] = useState<number | undefined>(editing?.coveredByEmployeeId);
    // Sin Franjas es día libre: el switch y la X de la última Franja llevan al mismo estado.
    const [intervals, setIntervals] = useState<AvailabilityInterval[]>(
        editing ? editing.intervals.map(i => [i.startTime, i.endTime] as AvailabilityInterval) : [DEFAULT_INTERVAL]
    );
    const [submitting, setSubmitting] = useState(false);
    const dayOff = intervals.length === 0;
    const valid = selected.length > 0 && intervalsValid(intervals);

    const handleSubmit = async () => {
        if (!valid || submitting) return;
        setSubmitting(true);
        const success = await onSave([...selected].sort(), intervals, coveredByEmployeeId);
        setSubmitting(false);
        if (success) {
            onClose();
        }
    };

    return (
        <PanelDialog
            open
            onOpenChange={(open) => !open && !submitting && onClose()}
            title="Elegí las fechas a anular"
            description="Reemplazan estas horas laborables esos días."
            className="max-w-[860px]"
            footer={
                <>
                    <PanelDialogClose disabled={submitting}>
                        <PanelButton variant="ghost" disabled={submitting}>Cerrar</PanelButton>
                    </PanelDialogClose>
                    <PanelButton disabled={!valid || submitting} onClick={handleSubmit}>
                        {submitting ? 'Guardando...' : 'Guardar anulación'}
                    </PanelButton>
                </>
            }
        >
            <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:divide-x md:divide-[#e5e7eb]">
                <Calendar
                    selected={selected}
                    initialDate={editing?.date}
                    onToggle={(date) => setSelected((s) => (s.includes(date) ? s.filter((d) => d !== date) : [...s, date]))}
                    isTaken={(date) => date !== editing?.date && taken.includes(date)}
                />
                {selected.length > 0 ? (
                    <div className="flex flex-col gap-4 md:pl-8">
                        <span className="text-[13.5px] font-bold tracking-[-0.01em] text-[#0f1b2d]">¿En qué horario atendés?</span>
                        {dayOff ? (
                            <PanelInput disabled readOnly aria-label="Horario" value="No atendés en todo el día" />
                        ) : (
                            <div className="flex items-start gap-2">
                                <IntervalsEditor intervals={intervals} onChange={setIntervals} />
                                <AddIntervalButton intervals={intervals} onChange={setIntervals} />
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <PanelSwitch
                                id="override-day-off"
                                checked={dayOff}
                                onCheckedChange={(off) => setIntervals(off ? [] : [DEFAULT_INTERVAL])}
                            />
                            <label htmlFor="override-day-off" className="text-[13.5px] font-bold text-[#0f1b2d]">
                                Día libre (todo el día)
                            </label>
                        </div>
                        <div className="flex flex-col gap-2 mt-4">
                            <label className="text-[13.5px] font-bold text-[#0f1b2d]">Cobertura (opcional)</label>
                            <select
                                value={coveredByEmployeeId ?? ''}
                                onChange={(e) => setCoveredByEmployeeId(e.target.value ? Number(e.target.value) : undefined)}
                                className="h-9 w-full rounded-md border border-[#d1d5db] bg-white px-3 text-[14px] outline-none focus:border-[#0f1b2d] focus:ring-1 focus:ring-[#0f1b2d]"
                            >
                                <option value="">Sin cobertura</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                ) : (
                    <p className="m-0 self-center text-center text-[13px] font-medium text-[#9ca3af] md:pl-8">
                        Elegí uno o más días en el calendario.
                    </p>
                )}
            </div>
        </PanelDialog>
    );
}

/** Las Anulaciones de un Empleado. */
export function OverridesSection({
    overrides,
    employees,
    onSaveOverride,
    onDeleteOverride,
}: {
    overrides: EmployeeOverride[];
    employees: Employee[];
    onSaveOverride: (dates: string[], intervals: AvailabilityInterval[], coveredByEmployeeId?: number, replacedDate?: string) => Promise<boolean>;
    onDeleteOverride: (date: string) => Promise<void>;
}) {
    const [editing, setEditing] = useState<EmployeeOverride | 'new' | null>(null);

    const handleSave = async (dates: string[], newIntervals: AvailabilityInterval[], coveredByEmployeeId: number | undefined) => {
        const replaced = editing === 'new' ? undefined : editing?.date;
        const success = await onSaveOverride(dates, newIntervals, coveredByEmployeeId, replaced);
        if (success) {
            setEditing(null);
        }
        return success;
    };

    return (
        <>
            <PanelSection
                title={
                    <>
                        Anular fechas
                        <span title="Una Anulación reemplaza por completo las Franjas de ese día.">
                            <Info className="size-4 text-[#6b7280]" />
                        </span>
                    </>
                }
                description="Agregá fechas en las que tu disponibilidad cambia respecto de tus horas semanales."
                action={
                    <PanelButton variant="secondary" onClick={() => setEditing('new')}>
                        <Plus className="size-4" />
                        Agregar una anulación
                    </PanelButton>
                }
            >
                {overrides.length > 0 && (
                    <ul className="m-0 list-none divide-y divide-[#e5e7eb] p-0">
                        {overrides.map((o) => (
                            <li key={o.date} className="flex items-center gap-4 px-6 py-4">
                                <div className="flex min-w-0 flex-col gap-1">
                                    <span className="text-[14px] font-semibold text-[#0f1b2d]">{formatDate(o.date)}</span>
                                    <span className="text-[13px] font-medium text-[#6b7280]">
                                        {o.intervals.length ? formatIntervals(o.intervals.map(i => [i.startTime, i.endTime] as AvailabilityInterval)) : 'Día libre'}
                                        {o.coveredByEmployeeId && <span className="ml-2 text-xs bg-gray-100 px-1 rounded text-gray-800">Cubierto por: {employees.find(e => e.id === o.coveredByEmployeeId)?.name}</span>}
                                    </span>
                                </div>
                                <div className="ml-auto flex gap-2">
                                    <PanelIconButton bordered label="Editar anulación" onClick={() => setEditing(o)}>
                                        <Pencil />
                                    </PanelIconButton>
                                    <PanelIconButton
                                        bordered
                                        destructive
                                        label="Quitar anulación"
                                        onClick={() => onDeleteOverride(o.date)}
                                    >
                                        <Trash2 />
                                    </PanelIconButton>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </PanelSection>

            {editing && (
                <OverrideDialog
                    editing={editing === 'new' ? undefined : editing}
                    taken={overrides.map((o) => o.date)}
                    employees={employees}
                    onClose={() => setEditing(null)}
                    onSave={handleSave}
                />
            )}
        </>
    );
}
