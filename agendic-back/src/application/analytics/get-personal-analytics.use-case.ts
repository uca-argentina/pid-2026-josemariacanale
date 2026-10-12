import { Inject, Injectable } from '@nestjs/common';
import {
  ANALYTICS_REPOSITORY,
  AnalyticsRepository,
  AnalyticsBreakdown,
  Granularity,
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
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';
import { defaultAvailability } from '../availabilities/default-availability';

/** Los KPIs con su valor en el rango pedido y en el período anterior, y lo que se grafica y lista debajo. */
export type PersonalAnalytics = AnalyticsBreakdown & {
  kpis: Record<KpiName, { current: number | null; previous: number | null }>;
  granularity: Granularity;
  filterOptions: { services: { id: number; name: string }[] };
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

/** Por día hasta 31 días, por semana hasta 183 y por mes en rangos más largos. */
const granularityOf = (days: number): Granularity =>
  days <= 31 ? 'day' : days <= 183 ? 'week' : 'month';

const formatDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Analíticas de los Servicios personales del Usuario de la Sesión. */
@Injectable()
export class GetPersonalAnalyticsUseCase {
  constructor(
    @Inject(ANALYTICS_REPOSITORY)
    private readonly analytics: AnalyticsRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Los KPIs de los Servicios personales del Usuario en el rango, cada uno con su valor en el período anterior
   * (mismo largo en días, termina justo antes de `from`), más la tendencia, el ranking de Servicios y las
   * Calificaciones recientes. Cuentan los Servicios ocultos y los dados de baja.
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
    const user = await this.users.findById(userId);
    const range = { from: formatDay(fromMs), to: formatDay(toMs) };
    const granularity = granularityOf(days);
    const [current, previous, breakdown, services] = await Promise.all([
      this.analytics.kpis(scope, range, now, serviceId),
      this.analytics.kpis(
        scope,
        {
          from: formatDay(fromMs - days * DAY_MS),
          to: formatDay(fromMs - DAY_MS),
        },
        now,
        serviceId,
      ),
      this.analytics.breakdown(
        scope,
        range,
        now,
        granularity,
        user?.weekStart ?? 1,
        serviceId,
      ),
      this.analytics.personalServices(userId),
    ]);
    return {
      ...breakdown,
      granularity,
      filterOptions: { services },
      kpis: Object.fromEntries(
        KPI_NAMES.map((name) => [
          name,
          { current: current[name], previous: previous[name] },
        ]),
      ) as PersonalAnalytics['kpis'],
    };
  }
}
