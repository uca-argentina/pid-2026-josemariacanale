import {
  DateRange,
  Granularity,
  KPI_NAMES,
  KpiName,
  KpiValues,
} from '../../domain/analytics/analytics.repository';
import { BadRequestError } from '../../domain/errors';

/** Un KPI con su valor en el rango pedido y en el período anterior. */
export type KpiPair = { current: number | null; previous: number | null };

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

/** Fecha YYYY-MM-DD → ms UTC; `null` si está mal formada o no existe en el calendario (2026-02-31). */
const parseDay = (value: unknown): number | null => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== value
    ? null
    : ms;
};

/** Por día hasta 31 días, por semana hasta 183 y por mes en rangos más largos. */
const granularityOf = (days: number): Granularity =>
  days <= 31 ? 'day' : days <= 183 ? 'week' : 'month';

const formatDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * El rango pedido, el período anterior (mismo largo en días, termina justo antes de `from`) y la granularidad
 * de la tendencia.
 *
 * @throws {BadRequestError} una fecha mal formada, `from` > `to`, o más de 366 días entre las dos
 */
export function parseAnalyticsRange(
  from: unknown,
  to: unknown,
): { range: DateRange; previous: DateRange; granularity: Granularity } {
  const fromMs = parseDay(from);
  const toMs = parseDay(to);
  if (
    fromMs === null ||
    toMs === null ||
    fromMs > toMs ||
    (toMs - fromMs) / DAY_MS > MAX_RANGE_DAYS
  )
    throw new BadRequestError(`Invalid analytics range ${from}..${to}`);
  const days = (toMs - fromMs) / DAY_MS + 1;
  return {
    range: { from: formatDay(fromMs), to: formatDay(toMs) },
    previous: {
      from: formatDay(fromMs - days * DAY_MS),
      to: formatDay(fromMs - DAY_MS),
    },
    granularity: granularityOf(days),
  };
}

/** Junta los KPIs del rango y del período anterior en `{ current, previous }` por KPI. */
export const pairKpis = (
  current: KpiValues,
  previous: KpiValues,
): Record<KpiName, KpiPair> =>
  Object.fromEntries(
    KPI_NAMES.map((name) => [
      name,
      { current: current[name], previous: previous[name] },
    ]),
  ) as Record<KpiName, KpiPair>;
