'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { es } from '@daypicker/react/locale';
import { FormProvider, useForm } from 'react-hook-form';
import { Info, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { Calendar } from '@/app/_components/ui/calendar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/app/_components/ui/dialog';
import { Switch } from '@/app/_components/ui/switch';
import {
    byStart,
    DEFAULT_INTERVAL,
    intervalsValid,
    toDateRanges,
    toTimeRanges,
} from '@/app/(app)/_components/availability-week';
import type { AvailabilityOverride, TimeRange } from '@/src/entities/models/availability';
import type { Preferences } from '@/src/entities/models/user';
import { DayRanges, type ScheduleFormValues } from './ScheduleComponent';

const LONG_DATE = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

const formatDate = (date: string) => LONG_DATE.format(new Date(`${date}T00:00:00Z`));
const formatTime = (time: string, timeFormat: Preferences['timeFormat']) =>
    timeFormat === 12 ? dayjs(`1970-01-01T${time}`).format('h:mma') : time;
const formatRanges = (ranges: TimeRange[], timeFormat: Preferences['timeFormat']) =>
    ranges.map(({ start, end }) => `${formatTime(start, timeFormat)} - ${formatTime(end, timeFormat)}`).join(', ');

/** `YYYY-MM-DD` ↔ el `Date` local de ese día, que es el que maneja el calendario. */
const toLocalDate = (date: string) => dayjs(date).toDate();
const toIsoDate = (date: Date) => dayjs(date).format('YYYY-MM-DD');

/**
 * El modal de Anulaciones: el calendario en modo múltiple a la izquierda y, al lado, las Franjas con el switch de día
 * libre. Al editar solo se elige una fecha. No deja elegir fechas pasadas ni ya anuladas, salvo la que se edita.
 */
function OverrideDialog({
    editing,
    taken,
    weekStart,
    timeFormat,
    onClose,
    onSave,
}: {
    editing?: AvailabilityOverride;
    taken: string[];
    weekStart: Preferences['weekStart'];
    timeFormat: Preferences['timeFormat'];
    onClose: () => void;
    onSave: (dates: string[], ranges: TimeRange[]) => void;
}) {
    const [selected, setSelected] = useState<string[]>(editing ? [editing.date] : []);
    const [dayOff, setDayOff] = useState(editing?.ranges.length === 0);
    const form = useForm<ScheduleFormValues>({
        defaultValues: { schedule: [toDateRanges(editing?.ranges.length ? editing.ranges : [DEFAULT_INTERVAL])] },
    });
    const ranges = toTimeRanges(form.watch('schedule.0'));
    const valid = selected.length > 0 && (dayOff || intervalsValid(ranges));

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Elegí las fechas a anular</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
                    <Calendar
                        mode="multiple"
                        locale={es}
                        weekStartsOn={weekStart}
                        defaultMonth={editing ? toLocalDate(editing.date) : undefined}
                        selected={selected.map(toLocalDate)}
                        onSelect={(dates, trigger) => setSelected(editing ? [toIsoDate(trigger)] : (dates ?? []).map(toIsoDate))}
                        disabled={[{ before: new Date() }, (day) => taken.includes(toIsoDate(day)) && toIsoDate(day) !== editing?.date]}
                    />
                    {selected.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <p className="m-0 text-sm font-medium">¿En qué horario atiende?</p>
                            {dayOff ? (
                                <p className="m-0 rounded-md border p-2 text-sm text-muted-foreground">No atiende en todo el día</p>
                            ) : (
                                <FormProvider {...form}>
                                    <DayRanges name="schedule.0" timeFormat={timeFormat} />
                                </FormProvider>
                            )}
                            <label className="flex items-center gap-2 text-sm">
                                <Switch checked={dayOff} onCheckedChange={setDayOff} data-testid="override-day-off" />
                                Día libre (todo el día)
                            </label>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                    <Button
                        disabled={!valid}
                        onClick={() => onSave([...selected].sort(), dayOff ? [] : [...ranges].sort(byStart))}
                    >
                        {editing ? 'Actualizar' : 'Guardar anulación'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Las Anulaciones de la Availability que se edita, en la zona horaria de esa Availability. Cargar una
 * fecha ya anulada reemplaza la anterior; nada se guarda hasta que el editor guarda.
 */
export function OverridesSection({
    overrides,
    preferences,
    busy,
    onChange,
}: {
    overrides: AvailabilityOverride[];
    preferences: Preferences;
    busy: boolean;
    onChange: (overrides: AvailabilityOverride[]) => void;
}) {
    const [editing, setEditing] = useState<AvailabilityOverride | 'new' | null>(null);

    return (
        <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <h2 className="m-0 text-base font-semibold">Anular fechas</h2>
                <span title="Una Anulación reemplaza por completo las Franjas de ese día.">
                    <Info className="size-4 text-muted-foreground" />
                </span>
            </div>
            <p className="m-0 text-sm text-muted-foreground">Fechas en las que el horario cambia respecto de la semana.</p>
            {overrides.length > 0 && (
                <ul className="m-0 list-none divide-y rounded-md border p-0" data-testid="date-overrides-list">
                    {overrides.map((o) => (
                        <li key={o.date} className="flex items-center gap-4 px-5 py-4">
                            <div className="flex min-w-0 flex-col gap-1">
                                <h3 className="m-0 text-sm font-medium capitalize">{formatDate(o.date)}</h3>
                                <p className="m-0 text-xs text-muted-foreground">
                                    {o.ranges.length ? formatRanges(o.ranges, preferences.timeFormat) : 'Día libre'}
                                </p>
                            </div>
                            <div className="ml-auto flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Editar anulación"
                                    title="Editar anulación"
                                    disabled={busy}
                                    onClick={() => setEditing(o)}
                                >
                                    <Pencil />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    aria-label="Quitar anulación"
                                    title="Quitar anulación"
                                    data-testid="delete-button"
                                    disabled={busy}
                                    onClick={() => onChange(overrides.filter((other) => other.date !== o.date))}
                                >
                                    <Trash2 />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <div>
                <Button variant="outline" disabled={busy} onClick={() => setEditing('new')} data-testid="add-override">
                    <Plus />
                    Agregar una anulación
                </Button>
            </div>

            {editing && (
                <OverrideDialog
                    editing={editing === 'new' ? undefined : editing}
                    taken={overrides.map((o) => o.date)}
                    weekStart={preferences.weekStart}
                    timeFormat={preferences.timeFormat}
                    onClose={() => setEditing(null)}
                    onSave={(dates, ranges) => {
                        const replaced = overrides.filter(
                            (o) => !dates.includes(o.date) && o.date !== (editing === 'new' ? '' : editing.date),
                        );
                        const added = dates.map((date) => ({ date, ranges }));
                        onChange([...replaced, ...added].sort((x, y) => x.date.localeCompare(y.date)));
                        setEditing(null);
                    }}
                />
            )}
        </section>
    );
}
