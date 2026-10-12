import { Inject, Injectable } from '@nestjs/common';
import {
  ANALYTICS_REPOSITORY,
  AnalyticsRepository,
  AnalyticsBreakdown,
  Granularity,
  KpiName,
} from '../../domain/analytics/analytics.repository';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { NotFoundError } from '../../domain/errors';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';
import { defaultAvailability } from '../availabilities/default-availability';
import { KpiPair, pairKpis, parseAnalyticsRange } from './analytics-range';

/** Los KPIs con su valor en el rango pedido y en el período anterior, y lo que se grafica y lista debajo. */
export type PersonalAnalytics = AnalyticsBreakdown & {
  kpis: Record<KpiName, KpiPair>;
  granularity: Granularity;
  filterOptions: { services: { id: number; name: string }[] };
};

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
    const { range, previous, granularity } = parseAnalyticsRange(from, to);

    if (serviceId !== undefined) {
      const service = await this.services.findById(serviceId);
      if (service?.userId !== userId)
        throw new NotFoundError(`Service ${serviceId} not found`);
    }

    const { timeZone } = await defaultAvailability(this.availabilities, userId);
    const scope = { kind: 'personal', userId, timeZone } as const;
    const now = this.clock.now();
    const user = await this.users.findById(userId);
    const [currentKpis, previousKpis, breakdown, services] = await Promise.all([
      this.analytics.kpis(scope, range, now, serviceId),
      this.analytics.kpis(scope, previous, now, serviceId),
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
      kpis: pairKpis(currentKpis, previousKpis),
    };
  }
}
