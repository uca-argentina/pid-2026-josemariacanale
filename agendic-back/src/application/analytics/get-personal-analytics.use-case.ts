import { Inject, Injectable } from '@nestjs/common';
import {
  ANALYTICS_REPOSITORY,
  AnalyticsRepository,
  KPI_NAMES,
  KpiName,
} from '../../domain/analytics/analytics.repository';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { BadRequestError, NotFoundError } from '../../domain/errors';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { defaultAvailability } from '../availabilities/default-availability';

export type PersonalAnalytics = {
  kpis: Record<KpiName, { current: number | null; previous: number | null }>;
};

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

const formatDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

@Injectable()
export class GetPersonalAnalyticsUseCase {
  constructor(
    @Inject(ANALYTICS_REPOSITORY)
    private readonly analytics: AnalyticsRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Los KPIs de los Servicios personales del Usuario en el rango, cada uno con su valor en el período anterior
   * (mismo largo en días, termina justo antes de `from`). Cuentan los Servicios ocultos y los dados de baja.
   *
   * @throws {BadRequestError} una fecha mal formada, `from` > `to`, o más de 366 días entre las dos
   * @throws {NotFoundError} `serviceId` no es un Servicio personal del Usuario
   * @throws {BusinessRuleError} el Usuario no tiene Availability predeterminada
   */
  async execute(
    userId: number,
    from: unknown,
    to: unknown,
    serviceId?: number,
  ): Promise<PersonalAnalytics> {
    const fromMs = parseDay(from);
    const toMs = parseDay(to);
    if (
      fromMs === null ||
      toMs === null ||
      fromMs > toMs ||
      (toMs - fromMs) / DAY_MS > MAX_RANGE_DAYS
    )
      throw new BadRequestError(`Invalid analytics range ${from}..${to}`);

    if (serviceId !== undefined) {
      const service = await this.services.findById(serviceId);
      if (service?.userId !== userId)
        throw new NotFoundError(`Service ${serviceId} not found`);
    }

    const { timeZone } = await defaultAvailability(this.availabilities, userId);
    const scope = { kind: 'personal', userId, timeZone } as const;
    const now = this.clock.now();
    const days = (toMs - fromMs) / DAY_MS + 1;
    const [current, previous] = await Promise.all([
      this.analytics.kpis(
        scope,
        { from: formatDay(fromMs), to: formatDay(toMs) },
        now,
        serviceId,
      ),
      this.analytics.kpis(
        scope,
        {
          from: formatDay(fromMs - days * DAY_MS),
          to: formatDay(fromMs - DAY_MS),
        },
        now,
        serviceId,
      ),
    ]);
    return {
      kpis: Object.fromEntries(
        KPI_NAMES.map((name) => [
          name,
          { current: current[name], previous: previous[name] },
        ]),
      ) as PersonalAnalytics['kpis'],
    };
  }
}
