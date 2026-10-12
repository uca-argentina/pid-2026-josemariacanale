import { z } from 'zod';

/** Los KPI de Analíticas, en el orden de las tarjetas. */
export const KPI_NAMES = [
    'booked',
    'attended',
    'rescheduled',
    'cancelled',
    'rejected',
    'pending',
    'noShows',
    'employeeNoShows',
    'averageRating',
    'csat',
    'revenue',
] as const;
export type KpiName = (typeof KPI_NAMES)[number];

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** El valor de un KPI en el período y en el anterior del mismo largo; `null` si no hay datos. */
export const kpiSchema = z.object({ current: z.number().nullable(), previous: z.number().nullable() });
export type Kpi = z.infer<typeof kpiSchema>;

/** Los conteos que dibuja el gráfico de tendencias, en el orden de la leyenda. */
export const TREND_SERIES = ['booked', 'attended', 'rescheduled', 'cancelled', 'rejected', 'noShows', 'employeeNoShows'] as const;
export type TrendSeries = (typeof TREND_SERIES)[number];

/** Cada cuánto agrupa el back los puntos del gráfico, según el largo del rango. */
export const granularitySchema = z.enum(['day', 'week', 'month']);
export type Granularity = z.infer<typeof granularitySchema>;

const trendPointSchema = z.object({
    bucket: dateSchema,
    ...Object.fromEntries(TREND_SERIES.map((name) => [name, z.number()])),
} as Record<TrendSeries, z.ZodNumber> & { bucket: typeof dateSchema });

/** Lo que el front lee de `GET /analytics/personal`: los KPI, la tendencia, el ranking, las Calificaciones y los filtros. */
export const personalAnalyticsSchema = z.object({
    kpis: z.object(Object.fromEntries(KPI_NAMES.map((name) => [name, kpiSchema])) as Record<KpiName, typeof kpiSchema>),
    granularity: granularitySchema,
    trend: z.array(trendPointSchema),
    popularServices: z.array(z.object({ serviceId: z.number(), name: z.string(), count: z.number() })),
    recentRatings: z.array(
        z.object({
            score: z.number(),
            comment: z.string().nullable(),
            createdAt: z.string(),
            clientName: z.string(),
            serviceName: z.string(),
            employeeName: z.string().nullable(),
        }),
    ),
    filterOptions: z.object({ services: z.array(z.object({ id: z.number(), name: z.string() })) }),
});
export type PersonalAnalytics = z.infer<typeof personalAnalyticsSchema>;

/** El período consultado: días `YYYY-MM-DD` inclusivos, y opcionalmente un solo Servicio personal. */
export const analyticsQuerySchema = z.object({
    from: dateSchema,
    to: dateSchema,
    serviceId: z.number().int().positive().optional(),
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
