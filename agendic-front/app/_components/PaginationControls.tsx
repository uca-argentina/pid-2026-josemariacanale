'use client';

import { useId, type ReactNode } from 'react';
import { Label } from '@/app/_components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/app/_components/ui/pagination';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/ui/select';

const PAGE_BUTTON = 'inline-flex h-8 items-center rounded-md border px-3 text-sm disabled:opacity-50';

/**
 * Pie de una lista paginada en el front: "Filas por página", "Página X de Y" y Anterior / Siguiente.
 * No guarda estado: `page` empieza en 0 y el que la usa lo mantiene, volviendo a 0 al cambiar `pageSize`.
 *
 * @param pageSizes opciones de "Filas por página"
 * @param summary texto opcional a la izquierda, por ejemplo cuántas filas hay en total
 */
export function PaginationControls({
    page,
    pageCount,
    pageSize,
    pageSizes = [10, 20, 30, 40, 50],
    summary,
    onPageChange,
    onPageSizeChange,
}: {
    page: number;
    pageCount: number;
    pageSize: number;
    pageSizes?: number[];
    summary?: ReactNode;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
}) {
    const selectId = useId();

    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            {summary && <div className="text-sm text-muted-foreground">{summary}</div>}
            <div className="ml-auto flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Label htmlFor={selectId} className="text-sm font-medium">
                        Filas por página
                    </Label>
                    <Select value={`${pageSize}`} onValueChange={(value) => onPageSizeChange(Number(value))}>
                        <SelectTrigger size="sm" className="w-20" id={selectId}>
                            <SelectValue placeholder={pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            <SelectGroup>
                                {pageSizes.map((size) => (
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
                                render={<button type="button" disabled={page === 0} onClick={() => onPageChange(page - 1)} />}
                                size="default"
                                aria-label="Ir a la página anterior"
                                className={PAGE_BUTTON}
                            >
                                Anterior
                            </PaginationLink>
                        </PaginationItem>
                        <PaginationItem className="px-2 text-sm font-medium">
                            Página {page + 1} de {pageCount}
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink
                                render={<button type="button" disabled={page >= pageCount - 1} onClick={() => onPageChange(page + 1)} />}
                                size="default"
                                aria-label="Ir a la página siguiente"
                                className={PAGE_BUTTON}
                            >
                                Siguiente
                            </PaginationLink>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </div>
    );
}
