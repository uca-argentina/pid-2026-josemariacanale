import { TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/app/_components/ui/badge';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { Skeleton } from '@/app/_components/ui/skeleton';
import { cn } from '@/app/_components/utils';
import { KPI_NAMES } from '@/src/entities/models/analytics';
import type { PersonalAnalyticsResult } from '../actions';

type Cards = Extract<PersonalAnalyticsResult, { ok: true }>['cards'];

const GRID = 'grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4';

const TONE = {
    good: 'text-green-700 dark:text-green-400',
    bad: 'text-red-700 dark:text-red-400',
    neutral: 'text-muted-foreground',
} as const;

/** Las tarjetas de KPI: valor y variación contra el período anterior, con flecha y color. */
export function KpiCards({ cards }: { cards: Cards }) {
    return (
        <div className={GRID}>
            {cards.map(({ id, label, value, change }) => (
                <Card key={id} data-testid={`kpi-${id}`} className="@container/card">
                    <CardHeader>
                        <CardDescription>{label}</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{value}</CardTitle>
                        <CardAction>
                            <Badge variant="outline" className={cn('gap-1', TONE[change.tone])}>
                                {change.direction === 'up' && <TrendingUp className="size-3" aria-hidden />}
                                {change.direction === 'down' && <TrendingDown className="size-3" aria-hidden />}
                                {change.text}
                            </Badge>
                        </CardAction>
                    </CardHeader>
                </Card>
            ))}
        </div>
    );
}

/** El esqueleto de las 11 tarjetas mientras carga. */
export function KpiCardsSkeleton() {
    return (
        <div className={GRID} aria-busy aria-label="Cargando analíticas">
            {Array.from({ length: KPI_NAMES.length }, (_, index) => (
                <Skeleton key={index} className="h-[104px] rounded-xl" />
            ))}
        </div>
    );
}
