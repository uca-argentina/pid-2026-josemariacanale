'use client';

import { useState } from 'react';
import { es } from '@daypicker/react/locale';
import { ChevronsUpDown, ListFilter, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/_components/ui/button';
import { Calendar } from '@/app/_components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/_components/ui/dropdown-menu';
import { Input } from '@/app/_components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/_components/ui/popover';
import { cn } from '@/app/_components/utils';
import type { Preferences } from '@/src/entities/models/user';
import { formatOutOfOfficeDate } from './format-out-of-office-date';
import {
    EMPTY_FILTERS,
    parseFilters,
    RANGE_PRESETS,
    resolveRange,
    writeFilters,
    type DateRangeFilter,
    type OutOfOfficeFilterState as Filters,
    type RangePreset,
} from './out-of-office-filters';
import { fromCalendarRange, toCalendarRange, toIsoDay, toLocalDay } from './out-of-office-range';

const SAVED_KEY = 'agendic:out-of-office:saved-filters';

type SavedFilter = { name: string; search: string };

/** Los filtros guardados en este navegador; si el storage no está o está roto, ninguno. */
const readSaved = (): SavedFilter[] => {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((entry): entry is SavedFilter => typeof entry?.name === 'string' && typeof entry?.search === 'string');
    } catch {
        return [];
    }
};

const writeSaved = (saved: SavedFilter[]) => {
    try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
        return true;
    } catch {
        return false;
    }
};

const rangeLabel = (range: DateRangeFilter) =>
    range.preset === 'custom'
        ? `${formatOutOfOfficeDate(range.from)} – ${formatOutOfOfficeDate(range.to)}`
        : RANGE_PRESETS[range.preset];

/**
 * El popover del Rango de Fechas: los presets a la izquierda y el Calendar; elegir días pasa a Rango personalizado.
 * Desde un preset, el primer clic arranca un rango nuevo en vez de mover un extremo del preset; el Calendar se
 * vuelve a montar con cada preset para mostrar su mes.
 */
function RangePicker({
    range,
    weekStart,
    onChange,
}: {
    range: DateRangeFilter;
    weekStart: Preferences['weekStart'];
    onChange: (range: DateRangeFilter) => void;
}) {
    const days = resolveRange(range, toIsoDay(new Date()));

    return (
        <div className="flex flex-wrap gap-2">
            <ul className="m-0 flex min-w-44 list-none flex-col gap-0.5 p-0">
                {(Object.keys(RANGE_PRESETS) as RangePreset[]).map((preset) => (
                    <li key={preset}>
                        <button
                            type="button"
                            className={cn(
                                'w-full rounded-md px-3 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent',
                                range.preset === preset && 'bg-accent font-medium',
                            )}
                            onClick={() => onChange(preset === 'custom' ? { preset, ...days } : { preset })}
                        >
                            {RANGE_PRESETS[preset]}
                        </button>
                    </li>
                ))}
            </ul>
            <Calendar
                key={range.preset}
                mode="range"
                locale={es}
                weekStartsOn={weekStart}
                defaultMonth={toLocalDay(days.to)}
                selected={toCalendarRange({ startDate: days.from, endDate: days.to })}
                onSelect={(selected, clicked) => {
                    const picked = fromCalendarRange(range.preset === 'custom' ? selected : { from: clicked });
                    if (picked) onChange({ preset: 'custom', from: picked.startDate, to: picked.endDate });
                }}
            />
        </div>
    );
}

/** "Guardar": pide un nombre y guarda los filtros actuales en este navegador; con el mismo nombre, lo pisa. */
function SaveFilterButton({ filters }: { filters: Filters }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');

    const save = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const saved = readSaved().filter((filter) => filter.name !== trimmed);
        if (!writeSaved([...saved, { name: trimmed, search: writeFilters(filters).toString() }])) {
            toast.error('No pudimos guardar el filtro en este navegador.');
            return;
        }
        toast.success('Filtro guardado');
        setName('');
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={<Button type="button" variant="outline" size="sm" />}>Guardar</PopoverTrigger>
            <PopoverContent align="end">
                <form
                    className="flex flex-col gap-2"
                    onSubmit={(event) => {
                        event.preventDefault();
                        save();
                    }}
                >
                    <Input aria-label="Nombre del filtro" placeholder="Nombre del filtro" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                    <Button type="submit" size="sm" disabled={!name.trim()}>
                        Guardar
                    </Button>
                </form>
            </PopoverContent>
        </Popover>
    );
}

/**
 * La barra de filtros de los períodos: buscador, "Filtrar" (Rango de Fechas) y los Filtros guardados en este
 * navegador. Con algún filtro activo aparece la fila de abajo: el chip del Rango de Fechas, "Borrar" y "Guardar".
 * Los filtros los tiene quien la usa; acá solo se cambian por `onChange`.
 *
 * El menú "Filtrar" no le devuelve el foco a su botón al cerrarse: el popover del chip nuevo se abre en ese
 * momento y el foco afuera lo cerraría.
 */
export function OutOfOfficeFilters({
    filters,
    weekStart,
    onChange,
}: {
    filters: Filters;
    weekStart: Preferences['weekStart'];
    onChange: (filters: Filters) => void;
}) {
    const [rangeOpen, setRangeOpen] = useState(false);
    const [saved, setSaved] = useState<SavedFilter[]>([]);
    const { range } = filters;
    const active = range !== null || filters.q.trim() !== '';

    return (
        <div className="mt-6 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24 @xl/main:w-72">
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <input
                        type="search"
                        aria-label="Buscar períodos"
                        placeholder="Buscar"
                        value={filters.q}
                        onChange={(e) => onChange({ ...filters, q: e.target.value })}
                        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/72"
                    />
                </label>

                <DropdownMenu>
                    <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
                        <ListFilter />
                        Filtrar
                        {range && <span className="rounded bg-muted px-1.5 text-xs font-semibold">1</span>}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" finalFocus={false}>
                        <DropdownMenuItem
                            disabled={range !== null}
                            onClick={() => {
                                onChange({ ...filters, range: { preset: '7d' } });
                                setRangeOpen(true);
                            }}
                        >
                            Rango de Fechas
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu onOpenChange={(open) => open && setSaved(readSaved())}>
                    <DropdownMenuTrigger render={<Button type="button" variant="outline" className="ml-auto text-muted-foreground" />}>
                        Filtros guardados
                        <ChevronsUpDown />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {saved.length === 0 ? (
                            <DropdownMenuItem disabled>No hay filtros guardados</DropdownMenuItem>
                        ) : (
                            saved.map(({ name, search }) => (
                                <DropdownMenuItem key={name} onClick={() => onChange(parseFilters(new URLSearchParams(search)))}>
                                    {name}
                                </DropdownMenuItem>
                            ))
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {active && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted p-2">
                    {range && (
                        <div className="flex items-stretch overflow-hidden rounded-md border bg-background text-sm">
                            <span className="px-2.5 py-1.5">Rango de Fechas</span>
                            <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
                                <PopoverTrigger className="flex items-center gap-1 border-s px-2.5 py-1.5 outline-none hover:bg-accent focus-visible:bg-accent">
                                    {rangeLabel(range)}
                                    <ChevronsUpDown className="size-4 text-muted-foreground" />
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-auto max-w-(--available-width)">
                                    <RangePicker range={range} weekStart={weekStart} onChange={(next) => onChange({ ...filters, range: next })} />
                                </PopoverContent>
                            </Popover>
                            <button
                                type="button"
                                aria-label="Quitar Rango de Fechas"
                                className="flex items-center border-s px-2 outline-none hover:bg-accent focus-visible:bg-accent"
                                onClick={() => onChange({ ...filters, range: null })}
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
                            Borrar
                        </Button>
                        <SaveFilterButton filters={filters} />
                    </div>
                </div>
            )}
        </div>
    );
}
