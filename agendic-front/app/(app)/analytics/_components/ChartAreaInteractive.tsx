'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { useIsMobile } from '@/app/_components/hooks/use-mobile';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/app/_components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/app/_components/ui/toggle-group';
import { REFERENCE_DATE, bookingsByDay, bookingsChartConfig } from './mock-analytics';

const RANGES = [
    { value: '90d', label: 'Últimos 3 meses', days: 90 },
    { value: '30d', label: 'Últimos 30 días', days: 30 },
    { value: '7d', label: 'Últimos 7 días', days: 7 },
];

// The data are calendar dates (UTC midnight); formatting them in UTC keeps the day the same in every zone.
const dayMonth = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** El gráfico de Turnos por día, filtrable por período: botones con ancho, desplegable sin él, 7 días en el celular. */
export function ChartAreaInteractive() {
    const isMobile = useIsMobile();
    const [chosenRange, chooseRange] = React.useState<string | null>(null);
    // Until the Usuario picks one, the range follows the screen: 7 days fit a phone, 3 months don't.
    const timeRange = chosenRange ?? (isMobile ? '7d' : '90d');

    const days = RANGES.find((range) => range.value === timeRange)?.days ?? 90;
    const startDate = new Date(REFERENCE_DATE);
    startDate.setUTCDate(startDate.getUTCDate() - days);
    const filteredData = bookingsByDay.filter((item) => new Date(item.date) >= startDate);

    return (
        <Card className="@container/card">
            <CardHeader>
                <CardTitle>Turnos</CardTitle>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">Total de los últimos 3 meses</span>
                    <span className="@[540px]/card:hidden">Últimos 3 meses</span>
                </CardDescription>
                <CardAction>
                    <ToggleGroup
                        type="single"
                        value={timeRange}
                        // Clicking the selected item would deselect it and leave no range.
                        onValueChange={(value) => value && chooseRange(value)}
                        variant="outline"
                        className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
                    >
                        {RANGES.map((range) => (
                            <ToggleGroupItem key={range.value} value={range.value}>
                                {range.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                    <Select value={timeRange} onValueChange={chooseRange}>
                        <SelectTrigger
                            className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                            size="sm"
                            aria-label="Elegí un período"
                        >
                            <SelectValue placeholder="Últimos 3 meses" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {RANGES.map((range) => (
                                <SelectItem key={range.value} value={range.value} className="rounded-lg">
                                    {range.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 @[540px]/card:px-6 @[540px]/card:pt-6">
                <ChartContainer config={bookingsChartConfig} className="aspect-auto h-[250px] w-full">
                    <AreaChart data={filteredData}>
                        <defs>
                            <linearGradient id="fillAccepted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-accepted)" stopOpacity={1.0} />
                                <stop offset="95%" stopColor="var(--color-accepted)" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="fillCancelled" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-cancelled)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-cancelled)" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(value) => dayMonth.format(new Date(value))}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) => dayMonth.format(new Date(value))}
                                    indicator="dot"
                                />
                            }
                        />
                        <Area
                            dataKey="cancelled"
                            type="natural"
                            fill="url(#fillCancelled)"
                            stroke="var(--color-cancelled)"
                            stackId="a"
                        />
                        <Area
                            dataKey="accepted"
                            type="natural"
                            fill="url(#fillAccepted)"
                            stroke="var(--color-accepted)"
                            stackId="a"
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
