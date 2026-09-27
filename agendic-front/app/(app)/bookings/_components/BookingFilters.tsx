'use client';

import { useId, useState } from 'react';
import { Popover } from 'radix-ui';
import { AtSign, ChevronDown, Layers, MapPin, Plus, SlidersHorizontal, User, UserRound, X } from 'lucide-react';
import { cn } from '@/app/_components/utils';
import { PanelButton, PanelCheckbox, PanelInput, PanelSelect } from '@/app/(app)/_components/panel-ui';
import type { BookingFilter, FilterField, ListField, TextField, TextOp } from '@/app/(app)/_components/mock-bookings';

type Field = { label: string; icon: typeof Layers } & ({ id: ListField; kind: 'list' } | { id: TextField; kind: 'text' });

// ponytail: el glosario dice Empleado; el panel ya rotula "Profesional" (ver BookingFlow.tsx).
const FIELDS: Field[] = [
    { id: 'service', kind: 'list', label: 'Servicio', icon: Layers },
    { id: 'employee', kind: 'list', label: 'Profesional', icon: UserRound },
    { id: 'branch', kind: 'list', label: 'Sucursal', icon: MapPin },
    { id: 'clientName', kind: 'text', label: 'Nombre del cliente', icon: User },
    { id: 'clientEmail', kind: 'text', label: 'Email del cliente', icon: AtSign },
];

const OP_LABEL: Record<TextOp, string> = { is: 'Es', contains: 'Contiene' };
const OPS = (Object.keys(OP_LABEL) as TextOp[]).map((value) => ({ value, label: OP_LABEL[value] }));

const emptyFilter = (field: Field): BookingFilter =>
    field.kind === 'list' ? { field: field.id, values: [] } : { field: field.id, op: 'is', value: '' };

const POPOVER =
    'z-50 w-[280px] overflow-hidden rounded-md border border-[#e5e7eb] bg-white shadow-[0_10px_30px_rgba(15,27,45,0.12)] outline-none';

function SearchBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
    return (
        <div className="border-b border-[#e5e7eb] p-2">
            <PanelInput aria-label={label} placeholder="Buscar" value={value} onChange={(e) => onChange(e.target.value)} autoFocus />
        </div>
    );
}

const NO_RESULTS = <li className="px-2.5 py-2 text-[13px] font-medium text-[#9ca3af]">Sin resultados</li>;

function FieldPicker({ available, onPick }: { available: Field[]; onPick: (field: Field) => void }) {
    const [query, setQuery] = useState('');
    const shown = available.filter((f) => f.label.toLowerCase().includes(query.trim().toLowerCase()));
    return (
        <>
            <SearchBox value={query} onChange={setQuery} label="Buscar filtro" />
            <ul className="m-0 flex list-none flex-col p-1">
                {shown.map((f) => (
                    <li key={f.id}>
                        <button
                            type="button"
                            onClick={() => onPick(f)}
                            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] font-semibold text-[#0f1b2d] outline-none hover:bg-[#f3f4f6] focus-visible:bg-[#f3f4f6] [&_svg]:size-4 [&_svg]:text-[#6b7280]"
                        >
                            <f.icon />
                            {f.label}
                        </button>
                    </li>
                ))}
                {shown.length === 0 && NO_RESULTS}
            </ul>
        </>
    );
}

function ListEditor({
    filter,
    options,
    onChange,
}: {
    filter: Extract<BookingFilter, { values: string[] }>;
    options: string[];
    onChange: (f: BookingFilter) => void;
}) {
    const idPrefix = useId();
    const [query, setQuery] = useState('');
    const shown = options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()));
    const toggle = (option: string, checked: boolean) =>
        onChange({ ...filter, values: checked ? [...filter.values, option] : filter.values.filter((v) => v !== option) });

    return (
        <>
            <SearchBox value={query} onChange={setQuery} label="Buscar opción" />
            <ul className="m-0 flex max-h-[240px] list-none flex-col overflow-y-auto p-1">
                {shown.map((option, i) => {
                    const id = `${idPrefix}-${i}`;
                    return (
                        <li key={option}>
                            <label
                                htmlFor={id}
                                className="flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-[13px] font-medium text-[#0f1b2d] hover:bg-[#f3f4f6]"
                            >
                                <PanelCheckbox
                                    id={id}
                                    checked={filter.values.includes(option)}
                                    onCheckedChange={(c) => toggle(option, c === true)}
                                />
                                {option}
                            </label>
                        </li>
                    );
                })}
                {shown.length === 0 && NO_RESULTS}
            </ul>
            <div className="border-t border-[#e5e7eb] p-2">
                <PanelButton variant="secondary" className="w-full" onClick={() => onChange({ ...filter, values: [] })}>
                    Limpiar
                </PanelButton>
            </div>
        </>
    );
}

function TextEditor({
    filter,
    onApply,
}: {
    filter: Extract<BookingFilter, { op: TextOp }>;
    onApply: (f: BookingFilter) => void;
}) {
    const [draft, setDraft] = useState(filter);
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onApply(draft);
            }}
        >
            <div className="flex flex-col gap-2 p-2">
                <PanelSelect
                    aria-label="Operador"
                    value={draft.op}
                    onValueChange={(op) => setDraft((d) => ({ ...d, op: op as TextOp }))}
                    options={OPS}
                />
                <PanelInput
                    aria-label="Valor"
                    value={draft.value}
                    onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                    autoFocus
                />
            </div>
            <div className="flex justify-between border-t border-[#e5e7eb] p-2">
                <PanelButton variant="secondary" onClick={() => onApply({ ...draft, value: '' })}>
                    Limpiar
                </PanelButton>
                <PanelButton type="submit">Aplicar</PanelButton>
            </div>
        </form>
    );
}

function ChipSummary({ filter }: { filter: BookingFilter }) {
    const VALUE = 'max-w-[240px] truncate rounded bg-[#f3f4f6] px-1.5 py-0.5 text-[12px] font-bold text-[#0f1b2d]';
    if ('values' in filter) {
        if (filter.values.length === 0) return null;
        return (
            <span className={VALUE}>
                {filter.values[0]}
                {filter.values.length > 1 && ` +${filter.values.length - 1}`}
            </span>
        );
    }
    if (!filter.value.trim()) return null;
    return (
        <>
            <span className="font-medium text-[#6b7280]">{OP_LABEL[filter.op].toLowerCase()}</span>
            <span className={VALUE}>{filter.value}</span>
        </>
    );
}

const CHIP =
    'inline-flex h-9 items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-3 text-[13px] font-bold whitespace-nowrap text-[#0f1b2d] transition-colors hover:bg-[#f3f4f6] outline-none focus-visible:ring-2 focus-visible:ring-[#0f1b2d] focus-visible:ring-offset-1 [&>svg]:size-4 [&>svg]:shrink-0';

export function BookingFilters({
    filters,
    onChange,
    options,
}: {
    filters: BookingFilter[];
    onChange: (filters: BookingFilter[]) => void;
    options: Record<ListField, string[]>;
}) {
    const [open, setOpen] = useState<FilterField | 'add' | null>(null);
    const available = FIELDS.filter((f) => !filters.some((active) => active.field === f.id));

    const setFilter = (next: BookingFilter) => onChange(filters.map((f) => (f.field === next.field ? next : f)));
    const add = (field: Field) => {
        onChange([...filters, emptyFilter(field)]);
        setOpen(field.id);
    };
    const toggle = (id: FilterField | 'add') => (next: boolean) => setOpen(next ? id : null);

    return (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {filters.map((filter) => {
                const field = FIELDS.find((f) => f.id === filter.field)!;
                return (
                    <Popover.Root key={filter.field} open={open === filter.field} onOpenChange={toggle(filter.field)}>
                        <Popover.Trigger asChild>
                            <button type="button" className={CHIP}>
                                <field.icon />
                                {field.label}
                                <ChipSummary filter={filter} />
                                <ChevronDown className="text-[#6b7280]" />
                            </button>
                        </Popover.Trigger>
                        <Popover.Portal>
                            <Popover.Content align="start" sideOffset={4} className={POPOVER}>
                                {'values' in filter ? (
                                    <ListEditor filter={filter} options={options[filter.field]} onChange={setFilter} />
                                ) : (
                                    <TextEditor
                                        filter={filter}
                                        onApply={(f) => {
                                            setFilter(f);
                                            setOpen(null);
                                        }}
                                    />
                                )}
                            </Popover.Content>
                        </Popover.Portal>
                    </Popover.Root>
                );
            })}

            {available.length > 0 && (
                <Popover.Root open={open === 'add'} onOpenChange={toggle('add')}>
                    <Popover.Trigger asChild>
                        {filters.length === 0 ? (
                            <button type="button" className={CHIP}>
                                <SlidersHorizontal />
                                Filtrar
                            </button>
                        ) : (
                            <button type="button" aria-label="Agregar filtro" title="Agregar filtro" className={cn(CHIP, 'w-9 justify-center px-0')}>
                                <Plus />
                            </button>
                        )}
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content
                            align="start"
                            sideOffset={4}
                            className={POPOVER}
                            // Al elegir un campo se abre el popover del chip nuevo; devolverle el foco a este
                            // botón lo cerraría por foco afuera.
                            onCloseAutoFocus={(e) => e.preventDefault()}
                        >
                            <FieldPicker available={available} onPick={add} />
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
            )}

            {filters.length > 0 && (
                <PanelButton variant="ghost" className="ml-auto text-[#6b7280]" onClick={() => onChange([])}>
                    <X className="size-4" />
                    Limpiar
                </PanelButton>
            )}
        </div>
    );
}
