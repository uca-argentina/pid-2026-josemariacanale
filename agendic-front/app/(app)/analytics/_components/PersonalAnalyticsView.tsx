'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { toIsoDay } from '@/app/_components/day-range';
import { Button } from '@/app/_components/ui/button';
import type { Preferences } from '@/src/entities/models/user';
import { loadPersonalAnalyticsAction, type PersonalAnalyticsData, type PersonalAnalyticsResult } from '../actions';
import { AnalyticsHeader } from './AnalyticsHeader';
import { BlocksSkeleton, PopularServices, RecentRatings } from './AnalyticsBlocks';
import { isValidCustomRange, parseRange, parseServiceId, rangeSearch, serviceSearch, type RangeChange } from './analytics-range';
import { KpiCards, KpiCardsSkeleton } from './KpiCards';
import { RangeSelect } from './RangeSelect';
import { IdFilter } from './IdFilter';
import { TrendsChart } from './TrendsChart';

const subscribeNever = () => () => {};

/**
 * Analíticas de los Servicios personales: el selector de alcance (`selector`), el de rango, el filtro por Servicio, las tarjetas de KPI, el gráfico de
 * tendencias, el ranking y las Calificaciones. El rango y el Servicio viven en la URL y se resuelven en el browser,
 * porque "hoy" es el de su zona; los datos se piden al server con ellos.
 */
export function PersonalAnalyticsView({ weekStart, selector }: { weekStart: Preferences['weekStart']; selector: React.ReactNode }) {
    const searchParams = useSearchParams();
    // El server no sabe en qué zona está el browser: hasta hidratar no hay rango.
    const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
    const range = mounted ? parseRange(searchParams, toIsoDay(new Date())) : null;
    const [attempt, setAttempt] = useState(0);
    // Los Servicios del filtro sobreviven a una recarga o a un error: el chip no vuelve a "#id" mientras carga.
    const [services, setServices] = useState<PersonalAnalyticsData['services']>([]);
    const [loaded, setLoaded] = useState<{ key: string; result: PersonalAnalyticsResult } | null>(null);

    const serviceId = mounted ? parseServiceId(searchParams) : undefined;
    const from = range?.from;
    const to = range?.to;
    const key = from && to ? `${from}..${to}:${serviceId ?? ''}#${attempt}` : null;
    const result = loaded?.key === key ? loaded.result : null;

    useEffect(() => {
        if (!from || !to || !key) return;
        let stale = false;
        loadPersonalAnalyticsAction({ from, to, serviceId }).then((next) => {
            if (stale) return;
            setLoaded({ key, result: next });
            if (next.ok) setServices(next.data.services);
        });
        return () => {
            stale = true;
        };
    }, [from, to, serviceId, key]);

    // Next sincroniza `useSearchParams` con `history.replaceState`: cambiar el rango es cambiar la URL.
    const change = (next: RangeChange) => {
        // Un rango de más de 366 días lo rechaza el back: se ignora la elección en vez de volver al valor por defecto.
        if (next.preset === 'custom' && !isValidCustomRange(next.from, next.to)) return;
        const search = rangeSearch(next);
        const kept = serviceSearch(search, serviceId);
        window.history.replaceState(null, '', `${window.location.pathname}${kept}`);
    };
    const changeService = (next: number | undefined) =>
        window.history.replaceState(null, '', `${window.location.pathname}${serviceSearch(window.location.search, next)}`);

    return (
        <div className="flex flex-1 flex-col gap-4 py-4 text-foreground @3xl/main:gap-6 @3xl/main:py-6">
            <AnalyticsHeader
                selector={selector}
                filters={range && <IdFilter label="Servicio" options={services} selected={serviceId} onChange={changeService} />}
                range={range && <RangeSelect range={range} weekStart={weekStart} onChange={change} />}
            />
            {result === null ? (
                <>
                    <KpiCardsSkeleton />
                    <BlocksSkeleton />
                </>
            ) : result.ok ? (
                <>
                    <KpiCards cards={result.data.cards} />
                    <TrendsChart chart={result.data.chart} />
                    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                        <PopularServices services={result.data.popularServices} />
                        <RecentRatings ratings={result.data.recentRatings} />
                    </div>
                </>
            ) : (
                <div role="alert" className="mx-4 flex items-center justify-between gap-3 rounded-lg border p-4 text-sm lg:mx-6">
                    No pudimos cargar las analíticas. Probá de nuevo en unos segundos.
                    <Button type="button" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
                        Reintentar
                    </Button>
                </div>
            )}
        </div>
    );
}
