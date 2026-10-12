import {
    CARD_KPIS,
    type CardKpi,
    TREND_SERIES,
    type Granularity,
    type PersonalAnalytics,
    type TrendSeries,
} from '@/src/entities/models/analytics';

const DASH = '—';

function decimal(value: number, digits: number) {
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: digits }).format(value);
}

/** Un conteo con separador de miles, como se muestra en las listas y tarjetas. */
export const count = (value: number) => decimal(value, 0);

/** Cómo se muestra cada tarjeta; `badWhenUp` es el KPI que empeora si sube (Cancelados y las dos Ausencias). */
const KPI_CARDS: Record<CardKpi, { label: string; format: (value: number) => string; badWhenUp?: true }> = {
    booked: { label: 'Reservados', format: count },
    attended: { label: 'Turnos atendidos', format: count },
    rescheduled: { label: 'Reagendados', format: count },
    cancelled: { label: 'Cancelados', format: count, badWhenUp: true },
    averageRating: { label: 'Calificación promedio', format: (value) => decimal(value, 1) },
    employeeNoShows: { label: 'Ausencias del Anfitrión', format: count, badWhenUp: true },
    noShows: { label: 'Ausencias del Invitado', format: count, badWhenUp: true },
    csat: { label: 'Satisfacción', format: (value) => `${decimal(value, 1)} %` },
};

/**
 * La variación % de `current` contra `previous`, hacia dónde va y si es buena: subir es malo en un KPI `badWhenUp`.
 * Sin base de comparación (`previous` 0 o `null`) o sin valor, es "0 %", `flat` y `neutral`, como en Cal.com.
 */
export function variation(current: number | null, previous: number | null, badWhenUp = false) {
    if (current === null || !previous) return { text: '0 %', direction: 'flat', tone: 'neutral' } as const;
    const percent = Math.round(((current - previous) / previous) * 1000) / 10;
    if (percent === 0) return { text: '0 %', direction: 'flat', tone: 'neutral' } as const;
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
    noShows: 'Ausencias del Invitado',
    employeeNoShows: 'Ausencias del Anfitrión',
};

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** El eje X: "12 oct" por día y por semana (el lunes que la abre), "oct 2026" por mes. A mano: sale igual en el server y en el browser. */
export function formatBucket(bucket: string, granularity: Granularity) {
    const [year, month, day] = bucket.split('-').map(Number);
    return granularity === 'month' ? `${MONTHS[month - 1]} ${year}` : `${day} ${MONTHS[month - 1]}`;
}

/**
 * Lo que comparten las analíticas personales y las de un Negocio: tarjetas de KPI, gráfico, Servicios más reservados y
 * Calificaciones recientes, ya formateados para la UI.
 */
export function presentSharedAnalytics({ kpis, granularity, trend, popularServices, recentRatings }: PersonalAnalytics) {
    return {
        chart: {
            series: TREND_SERIES.map((key) => ({ key, label: SERIES_LABELS[key] })),
            points: trend.map((point) => ({ ...point, label: formatBucket(point.bucket, granularity) })),
        },
        popularServices: popularServices.map(({ serviceId, name, count: n }) => ({ id: serviceId, name, count: count(n) })),
        recentRatings: recentRatings.map(({ score, comment, createdAt, clientName, serviceName, employeeName }) => ({
            score,
            comment,
            createdAt,
            clientName,
            serviceName,
            employeeName,
        })),
        cards: CARD_KPIS.map((id) => {
            const { label, format, badWhenUp } = KPI_CARDS[id];
            const { current, previous } = kpis[id];
            return { id, label, value: current === null ? DASH : format(current), change: variation(current, previous, badWhenUp) };
        }),
    };
}
