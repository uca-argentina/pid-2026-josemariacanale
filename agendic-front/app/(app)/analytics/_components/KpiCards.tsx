import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { Skeleton } from '@/app/_components/ui/skeleton';
import { cn } from '@/app/_components/utils';
import { CARD_KPIS } from '@/src/entities/models/analytics';
import type { PersonalAnalyticsData } from '../actions';

type Cards = PersonalAnalyticsData['cards'];

const GRID = 'grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4';

/** La flecha dice hacia dónde fue el KPI. */
const ICONS = { up: ArrowUpRight, flat: ArrowRight, down: ArrowDownRight } as const;

/** El color dice si el cambio es bueno: verde si mejora, rojo si empeora (Cancelados que suben), naranja si no cambia. */
const TONES = {
    good: { pill: 'bg-[#e6f6ec] text-[#15803d] dark:bg-green-950 dark:text-green-400', text: 'text-[#15803d] dark:text-green-400' },
    neutral: { pill: 'bg-orange-100 text-orange-500 dark:bg-orange-950 dark:text-orange-400', text: 'text-orange-500 dark:text-orange-400' },
    bad: { pill: 'bg-[#fdecec] text-[#b91c1c] dark:bg-red-950 dark:text-red-400', text: 'text-[#b91c1c] dark:text-red-400' },
} as const;

/** Las tarjetas de KPI: valor y, abajo, la variación contra el período anterior con su flecha y su color. */
export function KpiCards({ cards }: { cards: Cards }) {
    return (
        <div className={GRID}>
            {cards.map(({ id, label, value, change }) => {
                const Icon = ICONS[change.direction];
                const { pill, text } = TONES[change.tone];
                return (
                    <Card key={id} data-testid={`kpi-${id}`}>
                        <CardHeader>
                            <CardDescription className="text-base font-medium text-foreground">{label}</CardDescription>
                            <CardTitle className="text-3xl font-semibold tabular-nums">{value}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center gap-2 text-sm">
                            <span className={cn('flex h-6 w-9 items-center justify-center rounded-full', pill)}>
                                <Icon className="size-4" aria-hidden />
                            </span>
                            <span>
                                <span className={text}>{change.text}</span>{' '}
                                <span className="text-muted-foreground">respecto del período anterior</span>
                            </span>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

/** El esqueleto de las tarjetas mientras carga. */
export function KpiCardsSkeleton() {
    return (
        <div className={GRID} aria-busy aria-label="Cargando analíticas">
            {Array.from({ length: CARD_KPIS.length }, (_, index) => (
                <Skeleton key={index} className="h-[140px] rounded-xl" />
            ))}
        </div>
    );
}
