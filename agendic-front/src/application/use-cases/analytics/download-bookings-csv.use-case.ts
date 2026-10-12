import type { IAnalyticsRepository } from '@/src/application/repositories/analytics.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { BookingsCsvQuery } from '@/src/entities/models/analytics';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IDownloadBookingsCsvUseCase = ReturnType<typeof downloadBookingsCsvUseCase>;

/**
 * El CSV de Turnos de los Servicios personales o de un Negocio. No autoriza: el back decide quién lo ve, y sus errores salen tal cual.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el rango no es válido
 * @throws {UnauthorizedError} no es Empleado del Negocio, o filtra por Empleado sin ser el Dueño
 * @throws {NotFoundError} el Negocio, la Sucursal, el Servicio o el Empleado no existen
 */
export const downloadBookingsCsvUseCase =
    (instrumentationService: IInstrumentationService, analyticsRepository: IAnalyticsRepository) =>
    (query: BookingsCsvQuery): Promise<string> =>
        instrumentationService.startSpan({ name: 'downloadBookingsCsv Use Case', op: 'function' }, () =>
            analyticsRepository.downloadBookingsCsv(query),
        );
