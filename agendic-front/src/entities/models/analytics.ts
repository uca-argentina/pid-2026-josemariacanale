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

/**
 * Los KPI que se muestran como tarjetas, en el orden de Cal.com Insights; el back manda más de los que se muestran.
 * Vive en `entities` porque qué KPIs se presentan es una decisión de negocio, no de UI.
 */
export const CARD_KPIS = ['booked', 'attended', 'rescheduled', 'cancelled', 'averageRating', 'employeeNoShows', 'noShows', 'csat'] as const satisfies readonly KpiName[];
/** Un KPI con tarjeta. */
export type CardKpi = (typeof CARD_KPIS)[number];

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** El valor de un KPI en el período y en el anterior del mismo largo; `null` si no hay datos. */
export const kpiSchema = z.object({ current: z.number().nullable(), previous: z.number().nullable() });
export type Kpi = z.infer<typeof kpiSchema>;

/** Los conteos que dibuja el gráfico de tendencias, en el orden de la leyenda. */
export const TREND_SERIES = ['booked', 'attended', 'rescheduled', 'cancelled', 'rejected', 'noShows', 'employeeNoShows'] as const;
/** Una serie del gráfico de tendencias. */
export type TrendSeries = (typeof TREND_SERIES)[number];

/** Cada cuánto agrupa el back los puntos del gráfico, según el largo del rango. */
/** La agrupación del gráfico: por día, semana o mes. */
export const granularitySchema = z.enum(['day', 'week', 'month']);
/** Una agrupación del gráfico de tendencias. */
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

const idNameSchema = z.object({ id: z.number(), name: z.string() });
const rankedEmployeesSchema = z.array(z.object({ employeeId: z.number(), name: z.string(), imageUrl: z.string().nullable(), count: z.number() }));

/** Un Negocio del que el Usuario es Empleado, en el selector de Analíticas; el propio viene primero. */
export const analyticsBusinessSchema = z.object({ id: z.number(), name: z.string(), isOwner: z.boolean() });
export type AnalyticsBusiness = z.infer<typeof analyticsBusinessSchema>;

/**
 * Lo que el front lee de `GET /analytics/businesses/:businessId`: lo de las analíticas personales, con las Sucursales y
 * los Empleados como filtro y, solo para el Dueño, los rankings de Empleados.
 */
export const businessAnalyticsSchema = personalAnalyticsSchema.extend({
    filterOptions: z.object({
        branches: z.array(idNameSchema),
        services: z.array(idNameSchema),
        employees: z.array(idNameSchema).optional(),
    }),
    mostBookedEmployees: rankedEmployeesSchema.optional(),
    leastBookedEmployees: rankedEmployeesSchema.optional(),
    mostCancelledEmployees: rankedEmployeesSchema.optional(),
});
export type BusinessAnalytics = z.infer<typeof businessAnalyticsSchema>;

/** El período y los filtros de las analíticas de un Negocio. */
export const businessAnalyticsQuerySchema = analyticsQuerySchema.extend({
    businessId: z.number().int().positive(),
    branchId: z.number().int().positive().optional(),
    employeeId: z.number().int().positive().optional(),
});
export type BusinessAnalyticsQuery = z.infer<typeof businessAnalyticsQuerySchema>;

/** El período, la agrupación y los filtros de la tabla "Turnos por Empleado y período" (sin `employeeId`: la tabla es de todos). */
export const employeesPerPeriodQuerySchema = businessAnalyticsQuerySchema.omit({ employeeId: true }).extend({ granularity: granularitySchema });
export type EmployeesPerPeriodQuery = z.infer<typeof employeesPerPeriodQuerySchema>;

/** Lo que el front lee de `GET /analytics/businesses/:businessId/employees-per-period`: un conteo por bucket y por Empleado. */
export const employeesPerPeriodSchema = z.object({
    buckets: z.array(dateSchema),
    rows: z.array(z.object({ employeeId: z.number(), name: z.string(), imageUrl: z.string().nullable(), counts: z.array(z.number()) })),
});
export type EmployeesPerPeriod = z.infer<typeof employeesPerPeriodSchema>;
