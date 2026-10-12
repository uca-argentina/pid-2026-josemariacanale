'use client';

import { useEffect, useRef, useState } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardAction, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/app/_components/ui/chart';
import { cn } from '@/app/_components/utils';
import type { PersonalAnalyticsData } from '../actions';

const COLORS = ['#2563eb', '#16a34a', '#9333ea', '#ea580c', '#dc2626', '#ca8a04', '#0891b2'];

/**
 * "Tendencias": una línea por conteo. La leyenda, arriba a la derecha de la tarjeta, prende y apaga cada serie; el
 * tooltip con todos los valores del punto aparece al hacer clic y se va al hacer clic afuera del gráfico.
 */
export function TrendsChart({ chart }: { chart: PersonalAnalyticsData['chart'] }) {
    const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
    const [tooltipOpen, setTooltipOpen] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!tooltipOpen) return;
        const close = (event: PointerEvent) => {
            if (!chartRef.current?.contains(event.target as Node)) setTooltipOpen(false);
        };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, [tooltipOpen]);
    const config = Object.fromEntries(
        chart.series.map(({ key, label }, index) => [key, { label, color: COLORS[index % COLORS.length] }]),
    ) satisfies ChartConfig;
    const toggle = (key: string) =>
        setHidden((current) => {
            const next = new Set(current);
            if (!next.delete(key)) next.add(key);
            return next;
        });

    return (
        <Card className="mx-4 lg:mx-6">
            <CardHeader className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <CardTitle>Tendencias</CardTitle>
                <CardAction className="flex flex-wrap justify-end gap-x-4 gap-y-1">
                    {chart.series.map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={!hidden.has(key)}
                            onClick={() => toggle(key)}
                            className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', hidden.has(key) && 'line-through opacity-60')}
                        >
                            <span className="size-2 rounded-full" style={{ backgroundColor: config[key].color }} />
                            {label}
                        </button>
                    ))}
                </CardAction>
            </CardHeader>
            <div ref={chartRef} className="px-6" onClick={() => setTooltipOpen(true)}>
                <ChartContainer config={config} className="aspect-auto h-72 w-full" data-testid="trends-chart">
                    <LineChart data={chart.points} margin={{ left: 4, right: 12 }}>
                        <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#cbd5e1" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                        <ChartTooltip trigger="click" active={tooltipOpen ? undefined : false} content={<ChartTooltipContent labelKey="label" />} />
                        {chart.series.map(({ key }) => (
                            <Line
                                key={key}
                                dataKey={key}
                                type="monotone"
                                stroke={`var(--color-${key})`}
                                strokeWidth={2}
                                dot={false}
                                hide={hidden.has(key)}
                            />
                        ))}
                    </LineChart>
                </ChartContainer>
            </div>
        </Card>
    );
}
