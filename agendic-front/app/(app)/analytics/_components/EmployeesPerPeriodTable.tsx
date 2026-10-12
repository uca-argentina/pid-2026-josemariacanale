'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { PanelAvatar } from '@/app/(app)/_components/panel-ui';
import { Button } from '@/app/_components/ui/button';
import { Card, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { Input } from '@/app/_components/ui/input';
import { Skeleton } from '@/app/_components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/app/_components/ui/toggle-group';
import type { Granularity } from '@/src/entities/models/analytics';
import { loadEmployeesPerPeriodAction, type EmployeesPerPeriodResult } from '../actions';
import { employeesCsv, filterEmployees } from './employees-table';

const GRANULARITIES: Record<Granularity, string> = { day: 'Por día', week: 'Por semana', month: 'Por mes' };

/** Baja `csv` como `turnos-por-empleado.csv`; el BOM hace que Excel lo lea como UTF-8. */
function download(csv: string) {
    const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: 'turnos-por-empleado.csv' });
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * "Turnos por Empleado y período", solo del Dueño: un conteo por Empleado y bucket, con la agrupación (por semana al
 * empezar), un buscador por nombre y la descarga del CSV de lo que se ve. La agrupación y la búsqueda no van a la URL;
 * el rango y los filtros son los de la página.
 */
export function EmployeesPerPeriodTable({
    businessId,
    from,
    to,
    branchId,
    serviceId,
}: {
    businessId: number;
    from: string;
    to: string;
    branchId?: number;
    serviceId?: number;
}) {
    const [granularity, setGranularity] = useState<Granularity>('week');
    const [search, setSearch] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [loaded, setLoaded] = useState<{ key: string; result: EmployeesPerPeriodResult } | null>(null);
    const key = `${businessId}:${from}..${to}:${branchId ?? ''}:${serviceId ?? ''}:${granularity}#${attempt}`;
    const result = loaded?.key === key ? loaded.result : null;

    useEffect(() => {
        let stale = false;
        loadEmployeesPerPeriodAction({ businessId, from, to, granularity, branchId, serviceId }).then((next) => {
            if (!stale) setLoaded({ key, result: next });
        });
        return () => {
            stale = true;
        };
    }, [businessId, from, to, granularity, branchId, serviceId, key]);

    const data = result?.ok ? result.data : null;
    const rows = data ? filterEmployees(data.rows, search) : [];

    return (
        <Card className="mx-4 lg:mx-6">
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Turnos por Empleado y período</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                    <ToggleGroup
                        variant="outline"
                        spacing={0}
                        value={[granularity]}
                        onValueChange={([next]) => next && setGranularity(next as Granularity)}
                    >
                        {Object.entries(GRANULARITIES).map(([value, label]) => (
                            <ToggleGroupItem key={value} value={value}>
                                {label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                    <Input type="search" size="sm" className="w-44" placeholder="Buscar Empleado" aria-label="Buscar Empleado" value={search} onChange={(event) => setSearch(event.target.value)} />
                    <Button type="button" variant="outline" size="sm" disabled={!data} onClick={() => data && download(employeesCsv(data.labels, rows))}>
                        <Download /> Descargar CSV
                    </Button>
                </div>
            </CardHeader>
            {result === null ? (
                <Skeleton className="mx-6 h-40 rounded-xl" aria-busy aria-label="Cargando Turnos por Empleado" />
            ) : !data ? (
                <div role="alert" className="mx-6 flex items-center justify-between gap-3 rounded-lg border p-4 text-sm">
                    No pudimos cargar los Turnos por Empleado.
                    <Button type="button" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
                        Reintentar
                    </Button>
                </div>
            ) : rows.length === 0 ? (
                <p className="m-0 px-6 text-sm text-muted-foreground">{data.rows.length === 0 ? 'Sin Empleados en este período.' : 'Ningún Empleado coincide con la búsqueda.'}</p>
            ) : (
                <div className="px-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Empleado</TableHead>
                                {data.labels.map((label, index) => (
                                    <TableHead key={index} className="text-right">
                                        {label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map(({ id, name, imageUrl, counts }) => (
                                <TableRow key={id}>
                                    <TableCell>
                                        <span className="flex items-center gap-3">
                                            <PanelAvatar name={name} imageUrl={imageUrl} className="size-8" />
                                            <span className="whitespace-nowrap">{name}</span>
                                        </span>
                                    </TableCell>
                                    {counts.map((n, index) => (
                                        <TableCell key={index} className="text-right tabular-nums">
                                            {n === 0 ? '' : n}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </Card>
    );
}
