'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { toIsoDay } from '@/app/_components/day-range';
import { Button } from '@/app/_components/ui/button';
import type { AnalyticsBusiness } from '@/src/entities/models/analytics';
import type { Preferences } from '@/src/entities/models/user';
import { loadBusinessAnalyticsAction, type BusinessAnalyticsData, type BusinessAnalyticsResult } from '../actions';
import { BlocksSkeleton, EmployeeRanking, PopularServices, RecentRatings } from './AnalyticsBlocks';
import {
    bookingsCsvQuery,
    businessSearch,
    FILTER_NAMES,
    filterSearch,
    isValidCustomRange,
    parseBusinessFilters,
    parseRange,
    rangeSearch,
    type FilterName,
    type RangeChange,
} from './analytics-range';
import { BusinessSelect } from './BusinessSelect';
import { DownloadBookingsCsvButton } from './DownloadBookingsCsvButton';
import { EmployeesPerPeriodTable } from './EmployeesPerPeriodTable';
import { IdFilter } from './IdFilter';
import { KpiCards, KpiCardsSkeleton } from './KpiCards';
import { RangeSelect } from './RangeSelect';
import { TrendsChart } from './TrendsChart';

const subscribeNever = () => () => {};

const FAILURES = {
    forbidden: 'Solo los Empleados de este Negocio pueden ver sus analíticas. Elegí otro Negocio.',
    notFound: 'No encontramos este Negocio, o algo de lo que filtraste. Quitá el filtro o elegí otro Negocio.',
    error: 'No pudimos cargar las analíticas. Probá de nuevo en unos segundos.',
} as const;

type Options = Pick<BusinessAnalyticsData, 'branches' | 'services' | 'employees'>;
const NO_OPTIONS: Options = { branches: [], services: [], employees: null };

/**
 * Analíticas de un Negocio: el selector de Negocio, los filtros por Sucursal, Servicio y (solo el Dueño) Empleado, el
 * rango, los bloques que comparte con las personales y, para el Dueño, los rankings de Empleados. Todo vive en la URL y
 * se resuelve en el browser (ahí está "hoy"); los datos se piden al server con ello. Un 403 o un 404 dejan el selector.
 */
export function BusinessAnalyticsView({
    businesses,
    weekStart,
}: {
    businesses: AnalyticsBusiness[];
    weekStart: Preferences['weekStart'];
}) {
    const searchParams = useSearchParams();
    // El server no sabe en qué zona está el browser: hasta hidratar no hay rango.
    const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
    const range = mounted ? parseRange(searchParams, toIsoDay(new Date())) : null;
    const { business, branchId, serviceId, employeeId } = parseBusinessFilters(searchParams, businesses);
    const [attempt, setAttempt] = useState(0);
    // Las opciones de los filtros sobreviven a una recarga o a un error: el chip no vuelve a "#id" mientras carga.
    const [options, setOptions] = useState<{ businessId: number | undefined; value: Options }>({ businessId: undefined, value: NO_OPTIONS });
    const [loaded, setLoaded] = useState<{ key: string; result: BusinessAnalyticsResult } | null>(null);

    const businessId = business?.id;
    const from = range?.from;
    const to = range?.to;
    const key = from && to && businessId ? `${businessId}:${from}..${to}:${branchId ?? ''}:${serviceId ?? ''}:${employeeId ?? ''}#${attempt}` : null;
    const result = loaded?.key === key ? loaded.result : null;
    const filters = options.businessId === businessId ? options.value : NO_OPTIONS;

    useEffect(() => {
        if (!from || !to || !businessId || !key) return;
        let stale = false;
        loadBusinessAnalyticsAction({ businessId, from, to, branchId, serviceId, employeeId }).then((next) => {
            if (stale) return;
            setLoaded({ key, result: next });
            if (next.ok) setOptions({ businessId, value: { branches: next.data.branches, services: next.data.services, employees: next.data.employees } });
        });
        return () => {
            stale = true;
        };
    }, [businessId, from, to, branchId, serviceId, employeeId, key]);

    // Next sincroniza `useSearchParams` con `history.replaceState`: cambiar algo es cambiar la URL.
    const setSearch = (next: (search: string) => string) =>
        window.history.replaceState(null, '', `${window.location.pathname}${next(window.location.search)}`);
    const changeRange = (next: RangeChange) => {
        // Un rango de más de 366 días lo rechaza el back: se ignora la elección en vez de volver al valor por defecto.
        if (next.preset === 'custom' && !isValidCustomRange(next.from, next.to)) return;
        const params = new URLSearchParams(rangeSearch(next));
        const current = new URLSearchParams(window.location.search);
        for (const name of ['businessId', ...FILTER_NAMES]) {
            const value = current.get(name);
            if (value !== null) params.set(name, value);
        }
        const search = params.toString();
        window.history.replaceState(null, '', `${window.location.pathname}${search && `?${search}`}`);
    };
    const changeFilter = (name: FilterName) => (id: number | undefined) => setSearch((search) => filterSearch(search, name, id));

    return (
        <div className="flex flex-1 flex-col gap-4 py-4 text-foreground @3xl/main:gap-6 @3xl/main:py-6">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">Analíticas · Servicios del Negocio</h1>
                    <BusinessSelect businesses={businesses} selected={business} onChange={(id) => setSearch((search) => businessSearch(search, id))} />
                </div>
                {range && (
                    <div className="flex flex-wrap items-center gap-2">
                        <IdFilter label="Sucursal" options={filters.branches} selected={branchId} onChange={changeFilter('branchId')} />
                        <IdFilter label="Servicio" options={filters.services} selected={serviceId} onChange={changeFilter('serviceId')} />
                        {business?.isOwner && <IdFilter label="Empleado" options={filters.employees ?? []} selected={employeeId} onChange={changeFilter('employeeId')} />}
                        <RangeSelect range={range} weekStart={weekStart} onChange={changeRange} />
                        {businessId && <DownloadBookingsCsvButton query={bookingsCsvQuery(searchParams, toIsoDay(new Date()), businesses)!} />}
                    </div>
                )}
            </div>
            {result === null ? (
                <>
                    <KpiCardsSkeleton />
                    <BlocksSkeleton extra={business?.isOwner ? 3 : 0} />
                </>
            ) : result.ok ? (
                <>
                    <KpiCards cards={result.data.cards} />
                    <TrendsChart chart={result.data.chart} />
                    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                        <PopularServices services={result.data.popularServices} />
                        <RecentRatings ratings={result.data.recentRatings} />
                        {result.data.rankings && (
                            <>
                                <EmployeeRanking title="Empleados más reservados" employees={result.data.rankings.mostBooked} />
                                <EmployeeRanking title="Empleados menos reservados" employees={result.data.rankings.leastBooked} />
                                <EmployeeRanking title="Empleados con más Cancelaciones" employees={result.data.rankings.mostCancelled} />
                            </>
                        )}
                    </div>
                    {result.data.rankings && businessId && from && to && (
                        <EmployeesPerPeriodTable businessId={businessId} from={from} to={to} branchId={branchId} serviceId={serviceId} />
                    )}
                </>
            ) : (
                <div role="alert" className="mx-4 flex items-center justify-between gap-3 rounded-lg border p-4 text-sm lg:mx-6">
                    {FAILURES[result.reason]}
                    {result.reason === 'error' && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
                            Reintentar
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
