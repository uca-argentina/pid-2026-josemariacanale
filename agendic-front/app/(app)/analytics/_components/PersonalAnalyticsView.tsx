'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { toIsoDay } from '@/app/_components/day-range';
import { Button } from '@/app/_components/ui/button';
import type { Preferences } from '@/src/entities/models/user';
import { loadPersonalAnalyticsAction, type PersonalAnalyticsResult } from '../actions';
import { isValidCustomRange, parseRange, rangeSearch, type RangeChange } from './analytics-range';
import { KpiCards, KpiCardsSkeleton } from './KpiCards';
import { RangeSelect } from './RangeSelect';

const subscribeNever = () => () => {};

/**
 * Analíticas de los Servicios personales: el selector de rango y las tarjetas de KPI. El rango vive en la URL y se
 * resuelve en el browser, porque "hoy" es el de su zona; las tarjetas se piden al server con ese rango.
 */
export function PersonalAnalyticsView({ weekStart }: { weekStart: Preferences['weekStart'] }) {
    const searchParams = useSearchParams();
    // El server no sabe en qué zona está el browser: hasta hidratar no hay rango.
    const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
    const range = mounted ? parseRange(searchParams, toIsoDay(new Date())) : null;
    const [attempt, setAttempt] = useState(0);
    const [loaded, setLoaded] = useState<{ key: string; result: PersonalAnalyticsResult } | null>(null);

    const from = range?.from;
    const to = range?.to;
    const key = from && to ? `${from}..${to}#${attempt}` : null;
    const result = loaded?.key === key ? loaded.result : null;

    useEffect(() => {
        if (!from || !to || !key) return;
        let stale = false;
        loadPersonalAnalyticsAction({ from, to }).then((next) => {
            if (!stale) setLoaded({ key, result: next });
        });
        return () => {
            stale = true;
        };
    }, [from, to, key]);

    // Next sincroniza `useSearchParams` con `history.replaceState`: cambiar el rango es cambiar la URL.
    const change = (next: RangeChange) => {
        // Un rango de más de 366 días lo rechaza el back: se ignora la elección en vez de volver al valor por defecto.
        if (next.preset === 'custom' && !isValidCustomRange(next.from, next.to)) return;
        window.history.replaceState(null, '', `${window.location.pathname}${rangeSearch(next)}`);
    };

    return (
        <div className="flex flex-1 flex-col gap-4 py-4 text-foreground @3xl/main:gap-6 @3xl/main:py-6">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
                <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">Analíticas · Servicios personales</h1>
                {range && <RangeSelect range={range} weekStart={weekStart} onChange={change} />}
            </div>
            {result === null ? (
                <KpiCardsSkeleton />
            ) : result.ok ? (
                <KpiCards cards={result.cards} />
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
