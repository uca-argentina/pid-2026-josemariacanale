import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRetireCabinUseCase } from '@/src/application/use-cases/cabins/retire-cabin.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ id: z.number() });

export type IRetireCabinController = ReturnType<typeof retireCabinController>;
/**
 * Da de baja una Cabina de la Sucursal del Dueño.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no tiene la forma esperada
 */
export const retireCabinController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        retireCabinUseCase: IRetireCabinUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'retireCabin Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await retireCabinUseCase(data.id);
        });
