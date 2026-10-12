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

/** Lo que el front lee de `GET /analytics/personal`: por ahora solo los KPI. */
export const personalAnalyticsSchema = z.object({
    kpis: z.object(Object.fromEntries(KPI_NAMES.map((name) => [name, kpiSchema])) as Record<KpiName, typeof kpiSchema>),
});
export type PersonalAnalytics = z.infer<typeof personalAnalyticsSchema>;

/** El período consultado: días `YYYY-MM-DD` inclusivos, y opcionalmente un solo Servicio personal. */
export const analyticsQuerySchema = z.object({
    from: dateSchema,
    to: dateSchema,
    serviceId: z.number().int().positive().optional(),
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
