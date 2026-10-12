'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock, Ellipsis, Pencil, Plus, SearchX, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { OUT_OF_OFFICE_HOLIDAYS_PATH, OUT_OF_OFFICE_PATH } from '@/app/routes';
import { PaginationControls } from '@/app/_components/PaginationControls';
import { Button } from '@/app/_components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/_components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/app/_components/ui/toggle-group';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/app/_components/ui/empty';
import type { OutOfOffice } from '@/src/entities/models/out-of-office';
import type { Preferences } from '@/src/entities/models/user';
import { deleteOutOfOfficeAction } from '../actions';
import { HolidaysTab, type HolidaysTabData } from './HolidaysTab';
import { formatOutOfOfficeDate } from './format-out-of-office-date';
import { OutOfOfficeDialog } from './OutOfOfficeDialog';
import { OutOfOfficeFilters } from './OutOfOfficeFilters';
import { matchesFilters, parseFilters, writeFilters, type OutOfOfficeFilters as Filters } from './out-of-office-filters';
import { toIsoDay } from './out-of-office-range';
import { OUT_OF_OFFICE_REASONS } from './out-of-office-reasons';

/** Una fila: el emoji del Motivo en un círculo, el rango y debajo "Motivo · nota"; su menú ⋯ edita o borra el período. */
function OutOfOfficeRow({
    period,
    busy,
    onEdit,
    onDelete,
}: {
    period: OutOfOffice;
    busy: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const { emoji, label } = OUT_OF_OFFICE_REASONS[period.reason];

    return (
        <li className="flex items-center gap-3 px-4 py-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">{emoji}</div>
            <div className="flex min-w-0 flex-col">
                <p className="m-0 text-sm font-bold">
                    {formatOutOfOfficeDate(period.startDate)} – {formatOutOfOfficeDate(period.endDate)}
                </p>
                <p className="m-0 truncate text-sm text-muted-foreground">{period.notes ? `${label} · ${period.notes}` : label}</p>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={<Button type="button" variant="outline" size="icon" className="ml-auto" aria-label="Más acciones" disabled={busy} />}
                >
                    <Ellipsis />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem className="min-w-40" onClick={onEdit}>
                        <Pencil />
                        Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="min-w-40 text-destructive hover:bg-destructive/10 focus:bg-destructive/10 data-highlighted:bg-destructive/10"
                        onClick={onDelete}
                    >
                        <Trash2 />
                        Borrar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </li>
    );
}

/**
 * La pantalla Fuera de la oficina: los períodos del Usuario que llegan del server, paginados acá sobre la
 * lista completa (10 por página al principio). "Añadir" abre el modal de período nuevo, y con `openNew`
 * (`?nuevo`) arranca abierto. `weekStart` es el primer día de la semana del Usuario, para el Calendar del modal.
 * Con `holidays` (`?type=holidays`) muestra la pestaña Días festivos en lugar de los períodos.
 *
 * Los filtros (buscador y Rango de Fechas) se filtran acá sobre la lista completa y se copian a la URL con
 * `history.replaceState`, que no le vuelve a pedir la página al server en cada tecla.
 */
export function OutOfOfficeView({
    periods,
    openNew,
    weekStart,
    holidays,
}: {
    periods: OutOfOffice[];
    openNew: boolean;
    weekStart: Preferences['weekStart'];
    holidays?: HolidaysTabData;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [filters, setFilters] = useState(() => parseFilters(searchParams));
    const [dialog, setDialog] = useState<{ period: OutOfOffice | null } | null>(openNew ? { period: null } : null);
    const [busy, setBusy] = useState(false);
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(0);
    const today = toIsoDay(new Date());
    const matching = periods.filter((period) => matchesFilters(period, filters, today));
    const pageCount = Math.max(1, Math.ceil(matching.length / pageSize));
    const current = Math.min(page, pageCount - 1);
    const visible = matching.slice(current * pageSize, (current + 1) * pageSize);

    const changeFilters = (next: Filters) => {
        setFilters(next);
        setPage(0);
        const params = writeFilters(next, new URLSearchParams(window.location.search));
        window.history.replaceState(null, '', params.size ? `?${params}` : OUT_OF_OFFICE_PATH);
    };

    const closeDialog = () => {
        setDialog(null);
        if (!openNew) return;
        const params = new URLSearchParams(window.location.search);
        params.delete('nuevo');
        router.replace(params.size ? `${OUT_OF_OFFICE_PATH}?${params}` : OUT_OF_OFFICE_PATH);
    };

    const remove = async (period: OutOfOffice) => {
        setBusy(true);
        const result = await deleteOutOfOfficeAction(period.id);
        setBusy(false);
        if (result.ok) toast.success('Período borrado');
        else toast.error(result.message);
    };

    const tab = holidays ? 'holidays' : 'mine';

    const addButton = (
        <Button type="button" onClick={() => setDialog({ period: null })}>
            <Plus />
            Añadir
        </Button>
    );

    return (
        <div className="flex-1 bg-background px-4 py-8 text-foreground sm:px-8">
            <header className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                    <h1 className="m-0 text-xl font-extrabold tracking-tight">Fuera de la oficina</h1>
                    <p className="m-0 text-sm text-muted-foreground">
                        {holidays
                            ? 'Te marcamos como no disponible en los Días festivos que elijas.'
                            : 'Informá a tus Clientes cuando estés fuera de la oficina.'}
                    </p>
                </div>
                {!holidays && addButton}
            </header>

            <ToggleGroup
                className="mt-6"
                variant="outline"
                spacing={0}
                value={[tab]}
                onValueChange={([next]) => {
                    if (next && next !== tab) router.push(next === 'holidays' ? OUT_OF_OFFICE_HOLIDAYS_PATH : OUT_OF_OFFICE_PATH);
                }}
            >
                <ToggleGroupItem value="mine">Mis períodos</ToggleGroupItem>
                <ToggleGroupItem value="holidays">Días festivos</ToggleGroupItem>
            </ToggleGroup>

            {!holidays && periods.length > 0 && <OutOfOfficeFilters filters={filters} weekStart={weekStart} onChange={changeFilters} />}

            {holidays ? (
                <HolidaysTab data={holidays} />
            ) : matching.length > 0 ? (
                <>
                    <ul className="m-0 mt-4 list-none divide-y overflow-hidden rounded-md border p-0">
                        {visible.map((period) => (
                            <OutOfOfficeRow
                                key={period.id}
                                period={period}
                                busy={busy}
                                onEdit={() => setDialog({ period })}
                                onDelete={() => remove(period)}
                            />
                        ))}
                    </ul>
                    <PaginationControls
                        page={current}
                        pageCount={pageCount}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        onPageSizeChange={(size) => {
                            setPageSize(size);
                            setPage(0);
                        }}
                    />
                </>
            ) : periods.length > 0 ? (
                <Empty className="mt-4 rounded-md border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <SearchX />
                        </EmptyMedia>
                        <EmptyTitle>Ningún período coincide con los filtros</EmptyTitle>
                    </EmptyHeader>
                    <Button type="button" variant="outline" onClick={() => changeFilters({ q: '', range: null })}>
                        Borrar filtros
                    </Button>
                </Empty>
            ) : (
                <Empty className="mt-8 rounded-md border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Clock />
                        </EmptyMedia>
                        <EmptyTitle>Crear un período</EmptyTitle>
                        <EmptyDescription>Comunicá a tus Clientes cuando no estés disponible para tomar Turnos.</EmptyDescription>
                    </EmptyHeader>
                    {addButton}
                </Empty>
            )}

            {dialog && <OutOfOfficeDialog key={dialog.period?.id ?? 'new'} period={dialog.period} weekStart={weekStart} onClose={closeDialog} />}
        </div>
    );
}
