'use client';

import { useState } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { ChartContainer, ChartLegend, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/app/_components/ui/chart';
import { cn } from '@/app/_components/utils';
import type { PersonalAnalyticsData } from '../actions';

const COLORS = ['#2563eb', '#16a34a', '#9333ea', '#ea580c', '#dc2626', '#ca8a04', '#0891b2'];

/** "Tendencias": una línea por conteo; la leyenda prende y apaga cada serie y el tooltip muestra todos los valores del punto. */
export function TrendsChart({ chart }: { chart: PersonalAnalyticsData['chart'] }) {
    const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
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
            <CardHeader>
                <CardTitle>Tendencias</CardTitle>
            </CardHeader>
            <div className="px-6">
                <ChartContainer config={config} className="aspect-auto h-72 w-full" data-testid="trends-chart">
                    <LineChart data={chart.points} margin={{ left: 4, right: 12 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                        <ChartTooltip content={<ChartTooltipContent labelKey="label" />} />
                        <ChartLegend
                            content={() => (
                                <div className="flex flex-wrap justify-center gap-2 pt-3">
                                    {chart.series.map(({ key, label }) => (
                                        <button
                                            key={key}
                                            type="button"
                                            aria-pressed={!hidden.has(key)}
                                            onClick={() => toggle(key)}
                                            className={cn(
                                                'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
                                                hidden.has(key) && 'text-muted-foreground line-through opacity-60',
                                            )}
                                        >
                                            <span className="size-2 rounded-[2px]" style={{ backgroundColor: `var(--color-${key})` }} />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        />
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
