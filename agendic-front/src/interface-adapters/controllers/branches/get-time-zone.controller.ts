import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetTimeZoneUseCase } from '@/src/application/use-cases/branches/get-time-zone.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { locationSchema } from '@/src/entities/models/branch';

function presenter(timeZone: string, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getTimeZone Presenter', op: 'serialize' }, () => ({ timeZone }));
}

export type IGetTimeZoneController = ReturnType<typeof getTimeZoneController>;
/**
 * La zona horaria de un punto, para el formulario de Sucursal. Pide Sesión para no abrir la cuota de Google a cualquiera.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no es un punto válido
 */
export const getTimeZoneController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        getTimeZoneUseCase: IGetTimeZoneUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getTimeZone Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = locationSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await getTimeZoneUseCase(data), instrumentationService);
        });
