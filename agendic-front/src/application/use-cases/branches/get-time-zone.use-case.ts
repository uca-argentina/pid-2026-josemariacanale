import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ITimeZoneService } from '@/src/application/services/time-zone.service.interface';
import type { Location } from '@/src/entities/models/branch';

export type IGetTimeZoneUseCase = ReturnType<typeof getTimeZoneUseCase>;
/**
 * Averigua la zona horaria de la Ubicación de una Sucursal, para precargarla en el formulario.
 *
 * @throws {ApiRequestError} el proveedor no respondió o no tiene zona para el punto
 */
export const getTimeZoneUseCase =
    (instrumentationService: IInstrumentationService, timeZoneService: ITimeZoneService) =>
    (location: Location): Promise<string> =>
        instrumentationService.startSpan({ name: 'getTimeZone Use Case', op: 'function' }, () =>
            timeZoneService.getTimeZoneAt(location),
        );
