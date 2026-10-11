'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/app/_components/ui/empty';
import { Label } from '@/app/_components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/app/_components/ui/pagination';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/ui/select';
import type { OutOfOffice } from '@/src/entities/models/out-of-office';
import { formatOutOfOfficeDate } from './format-out-of-office-date';
import { OUT_OF_OFFICE_REASONS } from './out-of-office-reasons';

const PAGE_SIZES = [10, 20, 30, 40, 50];

/** Una fila: el emoji del Motivo en un círculo, el rango y debajo "Motivo · nota". */
function OutOfOfficeRow({ period }: { period: OutOfOffice }) {
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
        </li>
    );
}

/**
 * La pantalla Fuera de la oficina: los períodos del Usuario que llegan del server, paginados acá sobre la
 * lista completa (10 por página al principio).
 */
export function OutOfOfficeView({ periods }: { periods: OutOfOffice[] }) {
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(0);
    const pageCount = Math.max(1, Math.ceil(periods.length / pageSize));
    const current = Math.min(page, pageCount - 1);
    const visible = periods.slice(current * pageSize, (current + 1) * pageSize);

    return (
        <div className="flex-1 bg-background px-4 py-8 text-foreground sm:px-8">
            <header className="flex min-w-0 flex-col gap-1">
                <h1 className="m-0 text-xl font-extrabold tracking-tight">Fuera de la oficina</h1>
                <p className="m-0 text-sm text-muted-foreground">Informá a tus Clientes cuando estés fuera de la oficina.</p>
            </header>

            {periods.length > 0 ? (
                <>
                    <ul className="m-0 mt-8 list-none divide-y overflow-hidden rounded-md border p-0">
                        {visible.map((period) => (
                            <OutOfOfficeRow key={period.id} period={period} />
                        ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="out-of-office-page-size" className="text-sm font-medium">
                                Filas por página
                            </Label>
                            <Select
                                value={`${pageSize}`}
                                onValueChange={(value) => {
                                    setPageSize(Number(value));
                                    setPage(0);
                                }}
                            >
                                <SelectTrigger size="sm" className="w-20" id="out-of-office-page-size">
                                    <SelectValue placeholder={pageSize} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    <SelectGroup>
                                        {PAGE_SIZES.map((size) => (
                                            <SelectItem key={size} value={`${size}`}>
                                                {size}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <Pagination className="mx-0 w-fit">
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationLink
                                        render={<button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} />}
                                        size="default"
                                        aria-label="Ir a la página anterior"
                                        className="inline-flex h-8 items-center rounded-md border px-3 text-sm disabled:opacity-50"
                                    >
                                        Anterior
                                    </PaginationLink>
                                </PaginationItem>
                                <PaginationItem className="px-2 text-sm font-medium">
                                    Página {current + 1} de {pageCount}
                                </PaginationItem>
                                <PaginationItem>
                                    <PaginationLink
                                        render={
                                            <button type="button" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)} />
                                        }
                                        size="default"
                                        aria-label="Ir a la página siguiente"
                                        className="inline-flex h-8 items-center rounded-md border px-3 text-sm disabled:opacity-50"
                                    >
                                        Siguiente
                                    </PaginationLink>
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </>
            ) : (
                <Empty className="mt-8 rounded-md border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Clock />
                        </EmptyMedia>
                        <EmptyTitle>Crear un período</EmptyTitle>
                        <EmptyDescription>Comunicá a tus Clientes cuando no estés disponible para tomar Turnos.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
        </div>
    );
}
