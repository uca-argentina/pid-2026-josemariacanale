import { Inject, Injectable } from '@nestjs/common';
import {
  ANALYTICS_REPOSITORY,
  AnalyticsRepository,
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
import { defaultAvailability } from '../availabilities/default-availability';
import { parseAnalyticsRange } from './analytics-range';
import { bookingsCsv } from './bookings-csv';

/** El CSV de Turnos de los Servicios personales del Usuario de la Sesión. */
@Injectable()
export class ExportPersonalBookingsCsvUseCase {
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
   * Una fila por Turno de los Servicios personales del Usuario con `startsAt` en el rango (ocultos y dados de
   * baja incluidos), con el mismo alcance que `GetPersonalAnalyticsUseCase`.
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
  ): Promise<string> {
    const { range } = parseAnalyticsRange(from, to);
    if (serviceId !== undefined) {
      const service = await this.services.findById(serviceId);
      if (service?.userId !== userId)
        throw new NotFoundError(`Service ${serviceId} not found`);
    }
    const { timeZone } = await defaultAvailability(this.availabilities, userId);
    return bookingsCsv(
      await this.analytics.bookingRows(
        { kind: 'personal', userId, timeZone },
        range,
        this.clock.now(),
        serviceId,
      ),
    );
  }
}
