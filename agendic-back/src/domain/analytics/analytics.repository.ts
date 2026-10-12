/** Token de inyección del puerto {@link AnalyticsRepository}. */
export const ANALYTICS_REPOSITORY = Symbol('AnalyticsRepository');

/** Los KPIs de analíticas, en el orden en que se responden. */
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

/** Nombre de un KPI de analíticas. */
export type KpiName = (typeof KPI_NAMES)[number];

/** El valor de cada KPI en un período; `null` si no hay con qué calcularlo (sin Calificaciones). */
export type KpiValues = Record<KpiName, number | null>;

/**
 * Qué Turnos mira una consulta de analíticas, ya resuelto por el caso de uso.
 * `personal`: los Servicios personales del Usuario; `timeZone` es la de su Availability predeterminada.
 */
export type AnalyticsScope = {
  kind: 'personal';
  userId: number;
  timeZone: string;
};

/** Rango de fechas locales YYYY-MM-DD, inclusivo en los dos extremos. */
export type DateRange = { from: string; to: string };

/** Puerto de lectura de analíticas: el único lugar que sabe contar. */
export interface AnalyticsRepository {
  /**
   * Los KPIs del alcance en el rango, opcionalmente de un solo Servicio. `now` decide qué Turnos ya terminaron.
   */
  kpis(
    scope: AnalyticsScope,
    range: DateRange,
    now: Date,
    serviceId?: number,
  ): Promise<KpiValues>;
}
