import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRetireServiceUseCase } from '@/src/application/use-cases/services/retire-service.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { RetiredService } from '@/src/entities/models/service';

function presenter(retired: RetiredService, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'retireService Presenter', op: 'serialize' }, () => ({
        cancelledBookings: retired.cancelledBookings,
    }));
}

const inputSchema = z.object({ id: z.number().int() });

export type IRetireServiceController = ReturnType<typeof retireServiceController>;
/**
 * Dar de baja of the list and of the detail: retires the Servicio and tells how many Turnos got cancelled.
 *
 * @throws {UnauthenticatedError} there is no Sesión
 * @throws {InputParseError} the id is not a Servicio id
 * @throws {NotFoundError} the Servicio does not exist or was already retired
 * @throws {ApiRequestError} not the Dueño, or the back failed
 */
export const retireServiceController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        retireServiceUseCase: IRetireServiceUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'retireService Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await retireServiceUseCase(data), instrumentationService);
        });
