import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetPersonalAnalyticsUseCase } from '@/src/application/use-cases/analytics/get-personal-analytics.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import {
    analyticsQuerySchema,
    KPI_NAMES,
    TREND_SERIES,
    type Granularity,
    type KpiName,
    type PersonalAnalytics,
    type TrendSeries,
} from '@/src/entities/models/analytics';

const DASH = '—';

function decimal(value: number, digits: number) {
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: digits }).format(value);
}

const count = (value: number) => decimal(value, 0);


/** Cómo se muestra cada KPI; `badWhenUp` es el que empeora si sube (Cancelados, Rechazados, Ausencias, Faltas). */
const KPI_CARDS: Record<KpiName, { label: string; format: (value: number) => string; badWhenUp: boolean }> = {
    booked: { label: 'Reservados', format: count, badWhenUp: false },
    attended: { label: 'Turnos atendidos', format: count, badWhenUp: false },
    rescheduled: { label: 'Reagendados', format: count, badWhenUp: false },
    cancelled: { label: 'Cancelados', format: count, badWhenUp: true },
    rejected: { label: 'Rechazados', format: count, badWhenUp: true },
    pending: { label: 'Pendientes', format: count, badWhenUp: false },
    noShows: { label: 'Ausencias', format: count, badWhenUp: true },
    employeeNoShows: { label: 'Faltas del Empleado', format: count, badWhenUp: true },
    averageRating: { label: 'Calificación promedio', format: (value) => decimal(value, 1), badWhenUp: false },
    csat: { label: 'CSAT', format: (value) => `${decimal(value, 1)} %`, badWhenUp: false },
    revenue: {
        label: 'Ingresos',
        format: (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value),
        badWhenUp: false,
    },
};

/**
 * La variación % de `current` contra `previous`, con el sentido de la flecha y el color: subir es bueno salvo en
 * `badWhenUp`. Sin base de comparación (`previous` 0 o `null`) o sin valor, es "—" y sin flecha.
 */
export function variation(current: number | null, previous: number | null, badWhenUp: boolean) {
    if (current === null || !previous) return { text: DASH, direction: null, tone: 'neutral' } as const;
    const percent = Math.round(((current - previous) / previous) * 1000) / 10;
    if (percent === 0) return { text: '0 %', direction: null, tone: 'neutral' } as const;
    const direction = percent > 0 ? 'up' : 'down';
    return {
        text: `${percent > 0 ? '+' : '−'}${decimal(Math.abs(percent), 1)} %`,
        direction,
        tone: (direction === 'up') === badWhenUp ? 'bad' : 'good',
    } as const;
}

const SERIES_LABELS: Record<TrendSeries, string> = {
    booked: 'Reservados',
    attended: 'Atendidos',
    rescheduled: 'Reagendados',
    cancelled: 'Cancelados',
    rejected: 'Rechazados',
    noShows: 'Ausencias',
    employeeNoShows: 'Faltas del Empleado',
};

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** El eje X: "12 oct" por día y por semana (el lunes que la abre), "oct 2026" por mes. A mano: sale igual en el server y en el browser. */
export function formatBucket(bucket: string, granularity: Granularity) {
    const [year, month, day] = bucket.split('-').map(Number);
    return granularity === 'month' ? `${MONTHS[month - 1]} ${year}` : `${day} ${MONTHS[month - 1]}`;
}

function presenter({ kpis, granularity, trend, popularServices, recentRatings, filterOptions }: PersonalAnalytics, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getPersonalAnalytics Presenter', op: 'serialize' }, () => ({
        chart: {
            series: TREND_SERIES.map((key) => ({ key, label: SERIES_LABELS[key] })),
            points: trend.map((point) => ({ ...point, label: formatBucket(point.bucket, granularity) })),
        },
        popularServices: popularServices.map(({ serviceId, name, count: n }) => ({ id: serviceId, name, count: count(n) })),
        recentRatings,
        services: filterOptions.services,
        cards: KPI_NAMES.map((id) => {
            const { label, format, badWhenUp } = KPI_CARDS[id];
            const { current, previous } = kpis[id];
            return { id, label, value: current === null ? DASH : format(current), change: variation(current, previous, badWhenUp) };
        }),
    }));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IGetPersonalAnalyticsController = ReturnType<typeof getPersonalAnalyticsController>;

/**
 * Las tarjetas de KPI de los Servicios personales del Usuario con Sesión en un rango de días.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el rango o el Servicio no son válidos
 * @throws {NotFoundError} el Servicio no es un Servicio personal del Usuario
 */
export const getPersonalAnalyticsController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        getPersonalAnalyticsUseCase: IGetPersonalAnalyticsUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getPersonalAnalytics Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = analyticsQuerySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid analytics range', { cause: error });
            return presenter(await getPersonalAnalyticsUseCase(data), instrumentationService);
        });
