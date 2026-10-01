'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/app/_components/utils';
import {
    PanelButton,
    PanelDialog,
    PanelDialogClose,
    PanelField,
    PanelIconButton,
    PanelInput,
    PanelSection,
    PanelSelect,
    PanelSwitch,
} from '@/app/(app)/_components/panel-ui';
import {
    DAY_SHORT,
    DEFAULT_INTERVAL,
    formatIntervals,
    intervalsValid,
    type AvailabilityInterval,
} from '@/app/(app)/_components/availability-week';
import type { OverrideInterval } from '@/src/entities/models/override';
import { AddIntervalButton, IntervalsEditor } from './IntervalsEditor';
import type { StaffMember } from './AvailabilityView';

/** Una Anulación tal como la presenta el controller: `intervals: []` es día libre. */
export interface OverrideItem {
    date: string;
    intervals: OverrideInterval[];
}

/** Lo que el diálogo guarda: las fechas, las Franjas (`[]` = día libre) y el compañero que cubre, si hay. */
export interface OverrideDraft {
    dates: string[];
    intervals: OverrideInterval[];
    coveredByEmployeeId?: number;
}

const NO_COVER = 'none';

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const LONG_DATE = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const MONTH = new Intl.DateTimeFormat('es-AR', { month: 'long' });

const toTuples = (intervals: OverrideInterval[]): AvailabilityInterval[] => intervals.map((i) => [i.startTime, i.endTime]);
const toObjects = (intervals: AvailabilityInterval[]): OverrideInterval[] =>
    intervals.map(([startTime, endTime]) => ({ startTime, endTime }));

const formatDate = (date: string) => LONG_DATE.format(new Date(`${date}T00:00:00Z`));

function Calendar({
    selected,
    initialDate,
    onToggle,
    isTaken,
}: {
    selected: string[];
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
    const atOrBeforeThisMonth = view.y * 12 + view.m <= now.getFullYear() * 12 + now.getMonth();
    const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
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
    colleagues,
    onClose,
    onSave,
}: {
    editing?: OverrideItem;
    taken: string[];
    colleagues: StaffMember[];
    onClose: () => void;
    onSave: (draft: OverrideDraft) => void;
}) {
    const [selected, setSelected] = useState<string[]>(editing ? [editing.date] : []);
    const [intervals, setIntervals] = useState<AvailabilityInterval[]>(editing ? toTuples(editing.intervals) : [DEFAULT_INTERVAL]);
    const [cover, setCover] = useState(NO_COVER);
    const dayOff = intervals.length === 0;
    const valid = selected.length > 0 && intervalsValid(intervals);

    return (
        <PanelDialog
            open
            onOpenChange={(open) => !open && onClose()}
            title="Elegí las fechas a anular"
            description="Reemplazan las horas laborables esos días. Si guardás una fecha ya anulada, reemplazás lo anterior."
            className="max-w-[860px]"
            footer={
                <>
                    <PanelDialogClose>
                        <PanelButton variant="ghost">Cerrar</PanelButton>
                    </PanelDialogClose>
                    <PanelButton
                        disabled={!valid}
                        onClick={() =>
                            onSave({
                                dates: [...selected].sort(),
                                intervals: toObjects(intervals),
                                coveredByEmployeeId: cover === NO_COVER ? undefined : Number(cover),
                            })
                        }
                    >
                        Guardar anulación
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
                        <span className="text-[13.5px] font-bold tracking-[-0.01em] text-[#0f1b2d]">¿En qué horario atiende?</span>
                        {dayOff ? (
                            <PanelInput disabled readOnly aria-label="Horario" value="No atiende en todo el día" />
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
                        <PanelField
                            label="Cobertura"
                            htmlFor="override-cover"
                            hint="Un compañero que atiende en su lugar esos días. Tiene que atender los mismos Servicios."
                        >
                            <PanelSelect
                                id="override-cover"
                                value={cover}
                                onValueChange={setCover}
                                options={[
                                    { value: NO_COVER, label: 'Sin cobertura' },
                                    ...colleagues.map((c) => ({ value: String(c.id), label: c.name })),
                                ]}
                            />
                        </PanelField>
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

/**
 * Las Anulaciones del Empleado elegido, con su Cobertura opcional. Valen para todos sus Servicios, no
 * para una Availability. Al guardar o sacar una, el server refresca la lista.
 */
export function OverridesSection({
    overrides,
    colleagues,
    busy,
    onSave,
    onRemove,
}: {
    overrides: OverrideItem[];
    colleagues: StaffMember[];
    busy: boolean;
    /** Resuelve `true` si el back lo guardó, para cerrar el diálogo. */
    onSave: (draft: OverrideDraft) => Promise<boolean>;
    onRemove: (override: OverrideItem) => void;
}) {
    const [editing, setEditing] = useState<OverrideItem | 'new' | null>(null);

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
                description="Fechas en las que el horario de este Empleado cambia respecto de su semana."
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <PanelButton variant="ghost" disabled={busy || colleagues.length === 0} onClick={() => setEditing('new')}>
                            Redirigir tus turnos a otro empleado
                        </PanelButton>
                        <PanelButton variant="secondary" disabled={busy} onClick={() => setEditing('new')}>
                            <Plus className="size-4" />
                            Agregar una anulación
                        </PanelButton>
                    </div>
                }
            >
                {overrides.length > 0 && (
                    <ul className="m-0 list-none divide-y divide-[#e5e7eb] p-0">
                        {overrides.map((o) => (
                            <li key={o.date} className="flex items-center gap-4 px-6 py-4">
                                <div className="flex min-w-0 flex-col gap-1">
                                    <span className="text-[14px] font-semibold text-[#0f1b2d]">{formatDate(o.date)}</span>
                                    <span className="text-[13px] font-medium text-[#6b7280]">
                                        {o.intervals.length ? formatIntervals(toTuples(o.intervals)) : 'Día libre'}
                                    </span>
                                </div>
                                <div className="ml-auto flex gap-2">
                                    <PanelIconButton bordered label="Editar anulación" disabled={busy} onClick={() => setEditing(o)}>
                                        <Pencil />
                                    </PanelIconButton>
                                    <PanelIconButton
                                        bordered
                                        destructive
                                        label="Quitar anulación"
                                        disabled={busy}
                                        onClick={() => onRemove(o)}
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
                    colleagues={colleagues}
                    onClose={() => setEditing(null)}
                    onSave={async (draft) => {
                        if (await onSave(draft)) setEditing(null);
                    }}
                />
            )}
        </>
    );
}
