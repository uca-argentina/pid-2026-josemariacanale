'use client';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import { Copy, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import ReactSelect, { createFilter, type SingleValue } from 'react-select';
import { cn } from '@/app/_components/utils';
import { Button } from '@/app/_components/ui/button';
import { Checkbox } from '@/app/_components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/_components/ui/popover';
import { Switch } from '@/app/_components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/ui/tooltip';
import {
    DEFAULT_INTERVAL,
    END_OF_DAY_MS,
    invalidIntervals,
    toDateRanges,
    toTimeRanges,
    weekdays,
    type DateRange,
} from '@/app/(app)/_components/availability-week';

dayjs.extend(utc);
dayjs.extend(customParseFormat);

/** Lo que edita `ScheduleComponent`: las Franjas de los 7 días, índice 0 = domingo. */
export type ScheduleFormValues = { schedule: DateRange[][] };

type TimeFormat = 12 | 24;
type DayName = `schedule.${number}`;

const INCREMENT = 15;
const DEFAULT_DAY_RANGE = toDateRanges([DEFAULT_INTERVAL])[0];

const formatOf = (timeFormat: TimeFormat) => (timeFormat === 12 ? 'h:mma' : 'HH:mm');
const labelOf = (value: Date | number, timeFormat: TimeFormat) => dayjs.utc(value).format(formatOf(timeFormat));

function IconButton({ label, children, ...props }: { label: string } & React.ComponentProps<typeof Button>) {
    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <Button type="button" variant="ghost" size="icon" aria-label={label} {...props}>
                        {children}
                    </Button>
                }
            />
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

/**
 * Las horas semanales de la Availability: una fila por día con un switch, las Franjas con sus desplegables de hora,
 * quitar cada una, y a la derecha sumar Franja y copiarlas a otros días. Va dentro de un `FormProvider` de
 * `ScheduleFormValues`.
 *
 * @param weekStart primer día de la semana, 0 = domingo
 */
export function ScheduleComponent({ weekStart, timeFormat }: { weekStart: number; timeFormat: TimeFormat }) {
    return (
        <div className="flex flex-col divide-y">
            {weekdays(weekStart).map(({ index, name }) => (
                <ScheduleDay
                    key={index}
                    index={index}
                    weekday={name}
                    timeFormat={timeFormat}
                    weekStart={weekStart}
                />
            ))}
        </div>
    );
}

function ScheduleDay({
    index,
    weekday,
    timeFormat,
    weekStart,
}: {
    index: number;
    weekday: string;
    timeFormat: TimeFormat;
    weekStart: number;
}) {
    const name: DayName = `schedule.${index}`;
    const { watch, setValue, getValues } = useFormContext<ScheduleFormValues>();
    const { fields, remove, prepend, append } = useFieldArray<ScheduleFormValues, DayName>({ name });
    const dayRanges = watch(name);
    const lastNonEmptyRef = useRef<DateRange[] | null>(null);
    const working = dayRanges.length > 0;

    const toggle = (isChecked: boolean) => {
        if (isChecked) {
            const previous = lastNonEmptyRef.current;
            setValue(name, previous?.length ? previous : [DEFAULT_DAY_RANGE], { shouldDirty: true });
        } else {
            if (working) lastNonEmptyRef.current = dayRanges;
            setValue(name, [], { shouldDirty: true });
        }
    };

    return (
        <div className="flex w-full flex-wrap items-start gap-x-6 gap-y-2 px-6 py-3" data-testid={weekday}>
            <label className="flex h-8 w-[130px] shrink-0 items-center gap-3">
                <Switch checked={working} data-testid={`${weekday}-switch`} onCheckedChange={toggle} />
                <span className="text-sm font-medium capitalize">{weekday}</span>
            </label>
            {working ? (
                <DayRanges
                    name={name}
                    fields={fields}
                    remove={(i) => {
                        if (fields.length === 1) lastNonEmptyRef.current = null;
                        remove(i);
                    }}
                    timeFormat={timeFormat}
                />
            ) : (
                <span className="flex h-8 items-center text-sm text-muted-foreground">No disponible</span>
            )}
            <div className="ml-auto flex shrink-0 gap-2">
                <IconButton
                    label="Agregar Franja"
                    variant="outline"
                    data-testid="add-time-availability"
                    onClick={() => {
                        if (!working) return toggle(true);
                        const slotRange = getDateSlotRange(
                            getValues(`${name}.${fields.length - 1}`),
                            getValues(`${name}.0`),
                        );
                        if (slotRange?.append) append(slotRange.append);
                        if (slotRange?.prepend) prepend(slotRange.prepend);
                    }}
                >
                    <Plus />
                </IconButton>
                <CopyButton from={index} weekStart={weekStart} disabled={!working} />
            </div>
        </div>
    );
}

function CopyButton({ from, weekStart, disabled }: { from: number; weekStart: number; disabled: boolean }) {
    const [open, setOpen] = useState(false);
    const { setValue, getValues } = useFormContext<ScheduleFormValues>();

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger
                    render={
                        <PopoverTrigger
                            render={
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    disabled={disabled}
                                    aria-label="Copiar Franjas a otros días"
                                    data-testid="copy-button"
                                >
                                    <Copy />
                                </Button>
                            }
                        />
                    }
                />
                <TooltipContent>Copiar Franjas a otros días</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-60 gap-0 p-0">
                <CopyTimes
                    from={from}
                    weekStart={weekStart}
                    onApply={(days) => {
                        days.forEach((day) =>
                            setValue(`schedule.${day}`, getValues(`schedule.${from}`), { shouldDirty: true }),
                        );
                        setOpen(false);
                    }}
                    onCancel={() => setOpen(false)}
                />
            </PopoverContent>
        </Popover>
    );
}

/**
 * Las Franjas de un día, cada una con sus desplegables de inicio y fin y su X. Quitar la última deja el día sin
 * Franjas. Las que terminan antes de empezar o se solapan quedan marcadas.
 */
function DayRanges({
    name,
    fields,
    remove,
    timeFormat,
}: {
    name: DayName;
    fields: { id: string }[];
    remove: (index: number) => void;
    timeFormat: TimeFormat;
}) {
    const { watch } = useFormContext<ScheduleFormValues>();
    const invalid = invalidIntervals(toTimeRanges(watch(name)));

    return (
        <div className="flex flex-col gap-2">
            {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                    <Controller
                        name={`${name}.${index}`}
                        render={({ field }) => (
                            <TimeRangeField
                                timeFormat={timeFormat}
                                invalid={invalid.includes(index)}
                                value={field.value}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <IconButton label="Quitar Franja" onClick={() => remove(index)}>
                        <X />
                    </IconButton>
                </div>
            ))}
        </div>
    );
}

function TimeRangeField({
    value,
    onChange,
    timeFormat,
    invalid,
}: {
    value: DateRange;
    onChange: (value: DateRange) => void;
    timeFormat: TimeFormat;
    invalid: boolean;
}) {
    return (
        <div className="flex flex-row items-center gap-2">
            <LazySelect
                label="Desde"
                timeFormat={timeFormat}
                invalid={invalid}
                value={value.start}
                onChange={(option) => {
                    const newStart = new Date(option!.value);
                    if (newStart >= value.end) {
                        const newEnd = new Date(option!.value);
                        newEnd.setMinutes(newEnd.getMinutes() + INCREMENT);
                        onChange({ ...value, start: newStart, end: newEnd });
                    } else {
                        onChange({ ...value, start: newStart });
                    }
                }}
            />
            <span className="text-sm text-muted-foreground">-</span>
            <LazySelect
                label="Hasta"
                timeFormat={timeFormat}
                invalid={invalid}
                value={value.end}
                min={value.start}
                onChange={(option) => onChange({ ...value, end: new Date(option!.value) })}
            />
        </div>
    );
}

interface IOption {
    readonly label: string;
    readonly value: number;
}

/** Hora escrita (`HH:mm` o `h:mma`, el del `timeFormat` primero) como instante UTC del 1970-01-01, o null si no es una hora. */
function parseTimeString(input: string, timeFormat: TimeFormat): Date | null {
    if (!input.trim()) return null;
    const parsed = dayjs(input, timeFormat === 12 ? ['h:mma', 'HH:mm'] : ['HH:mm', 'h:mma'], true);
    if (!parsed.isValid()) return null;
    if (parsed.hour() === 23 && parsed.minute() === 59) return new Date(END_OF_DAY_MS);
    return new Date(Date.UTC(1970, 0, 1, parsed.hour(), parsed.minute()));
}

function LazySelect({
    value,
    min,
    timeFormat,
    label,
    invalid,
    onChange,
}: {
    value: Date;
    min?: Date;
    timeFormat: TimeFormat;
    label: string;
    invalid: boolean;
    onChange: (option: SingleValue<IOption>) => void;
}) {
    const { options, filter } = useOptions(timeFormat);
    const instanceId = useId();

    useEffect(() => {
        filter({ current: value });
    }, [filter, value]);

    const [inputValue, setInputValue] = useState('');
    const [timeInputError, setTimeInputError] = useState(false);
    const defaultFilter = useMemo(() => createFilter(), []);

    const handleInputChange = useCallback(
        (newValue: string, actionMeta: { action: string }) => {
            setInputValue(newValue);
            const trimmed = newValue.trim();
            if (actionMeta.action !== 'input-change' || !trimmed) return setTimeInputError(false);

            const parsed = parseTimeString(trimmed, timeFormat);
            const looksLikeTime = /^\d{1,2}:\d{2}(a|p|am|pm)?$/i.test(trimmed);
            if (!parsed) return setTimeInputError(looksLikeTime);
            setTimeInputError(min ? parsed <= min : false);
        },
        [timeFormat, min],
    );

    const filteredOptions = useMemo(() => {
        const dropdownOptions = options.filter((option) =>
            defaultFilter({ label: option.label, value: option.label, data: option.label }, inputValue),
        );

        const parsed = parseTimeString(inputValue.trim(), timeFormat);
        if (parsed && (!min || parsed > min) && !options.some((option) => option.value === parsed.getTime())) {
            return [{ label: labelOf(parsed, timeFormat), value: parsed.getTime() }, ...dropdownOptions];
        }
        return dropdownOptions;
    }, [inputValue, options, defaultFilter, timeFormat, min]);

    const currentValue = value.getTime();
    const currentOption =
        options.find((option) => option.value === currentValue) ?? { value: currentValue, label: labelOf(value, timeFormat) };

    return (
        <ReactSelect<IOption>
            instanceId={instanceId}
            aria-label={label}
            options={filteredOptions}
            onMenuOpen={() => {
                if (min) filter({ offset: min });
                else filter({});
            }}
            menuPlacement="bottom"
            value={currentOption}
            onMenuClose={() => filter({ current: value })}
            components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
            onInputChange={handleInputChange}
            filterOption={() => true}
            onChange={onChange}
            noOptionsMessage={() => 'Sin resultados.'}
            className="block w-[110px]"
            unstyled
            classNames={{
                control: (state) =>
                    cn(
                        'flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm transition-colors',
                        state.isFocused ? 'border-ring ring-1 ring-ring' : 'hover:border-muted-foreground',
                        (invalid || timeInputError) && 'border-destructive hover:border-destructive',
                    ),
                singleValue: () => 'text-foreground',
                input: () => 'text-foreground',
                menu: () => 'z-50 mt-1 rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md',
                menuList: () => 'max-h-60 overflow-y-auto',
                option: (state) =>
                    cn('cursor-pointer rounded-md px-3 py-2', state.isFocused && 'bg-muted', state.isSelected && 'bg-accent font-medium'),
                noOptionsMessage: () => 'py-2 text-center text-muted-foreground',
            }}
        />
    );
}

/**
 * Las horas del día cada 15 minutos más el fin del día (`23:59`), con su etiqueta en el `timeFormat`. `options` empieza
 * vacía y `filter` la llena al abrir el desplegable: renderizar las 97 opciones de cada Franja demora al sumar una.
 */
function useOptions(timeFormat: TimeFormat) {
    const [filteredOptions, setFilteredOptions] = useState<IOption[]>([]);

    const options = useMemo<IOption[]>(
        () =>
            [...Array.from({ length: (24 * 60) / INCREMENT }, (_, i) => i * INCREMENT * 60_000), END_OF_DAY_MS].map((value) => ({
                value,
                label: labelOf(value, timeFormat),
            })),
        [timeFormat],
    );

    const filter = useCallback(
        ({ offset, current }: { offset?: Date; current?: Date }) => {
            if (current) {
                const currentValue = current.getTime();
                setFilteredOptions([
                    options.find((option) => option.value === currentValue) ?? {
                        value: currentValue,
                        label: labelOf(current, timeFormat),
                    },
                ]);
            } else {
                setFilteredOptions(options.filter((option) => !offset || option.value > offset.getTime()));
            }
        },
        [options, timeFormat],
    );

    return { options: filteredOptions, filter };
}

/** La Franja que suma el `+`: una hora desde el fin de la última, o, si el día termina ahí, una hora antes de la primera. */
const getDateSlotRange = (last: DateRange, first: DateRange) => {
    const nextStart = dayjs.utc(last.end);
    const nextEnd =
        nextStart.hour() === 23
            ? nextStart.add(59, 'minutes').add(59, 'seconds').add(999, 'milliseconds')
            : nextStart.add(1, 'hour');
    const endOfDay = nextStart.endOf('day');

    if (!nextStart.isSame(endOfDay)) {
        return { append: { start: nextStart.toDate(), end: (nextEnd.isAfter(endOfDay) ? endOfDay : nextEnd).toDate() } };
    }

    const firstStart = dayjs.utc(first.start);
    const startOfDay = firstStart.startOf('day');
    if (!firstStart.isSame(startOfDay)) {
        const previous = firstStart.subtract(1, 'hour');
        return { prepend: { start: (previous.isBefore(startOfDay) ? startOfDay : previous).toDate(), end: firstStart.toDate() } };
    }
};

function CopyTimes({
    from,
    weekStart,
    onApply,
    onCancel,
}: {
    from: number;
    weekStart: number;
    onApply: (days: number[]) => void;
    onCancel: () => void;
}) {
    const [selected, setSelected] = useState<number[]>([]);

    return (
        <div className="flex flex-col py-2">
            <div className="p-2">
                <p className="pb-3 pl-1 text-xs font-medium uppercase">Copiar Franjas a</p>
                <ol className="flex flex-col gap-2">
                    <li>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox
                                checked={selected.length === 6}
                                onCheckedChange={(on) =>
                                    setSelected(on ? weekdays(weekStart).map(({ index }) => index).filter((i) => i !== from) : [])
                                }
                            />
                            Seleccionar todos
                        </label>
                    </li>
                    {weekdays(weekStart).map(({ index, name }) => (
                        <li key={index}>
                            <label className="flex cursor-pointer items-center gap-2 text-sm capitalize has-disabled:cursor-default">
                                <Checkbox
                                    checked={selected.includes(index) || index === from}
                                    disabled={index === from}
                                    onCheckedChange={(on) =>
                                        setSelected((current) => (on ? [...current, index] : current.filter((d) => d !== index)))
                                    }
                                />
                                {name}
                            </label>
                        </li>
                    ))}
                </ol>
            </div>
            <hr />
            <div className="flex justify-end gap-2 px-2 pt-2">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="button" disabled={selected.length === 0} onClick={() => onApply(selected)}>
                    Aplicar
                </Button>
            </div>
        </div>
    );
}
