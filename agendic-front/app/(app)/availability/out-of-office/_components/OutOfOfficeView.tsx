'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { PaginationControls } from '@/app/_components/PaginationControls';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/app/_components/ui/empty';
import type { OutOfOffice } from '@/src/entities/models/out-of-office';
import { formatOutOfOfficeDate } from './format-out-of-office-date';
import { OUT_OF_OFFICE_REASONS } from './out-of-office-reasons';

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
