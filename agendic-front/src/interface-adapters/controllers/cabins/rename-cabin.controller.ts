import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRenameCabinUseCase } from '@/src/application/use-cases/cabins/rename-cabin.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { renameCabinSchema, type Cabin } from '@/src/entities/models/cabin';

function presenter(cabin: Cabin, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'renameCabin Presenter', op: 'serialize' }, () => ({
        id: cabin.id,
        branchId: cabin.branchId,
        name: cabin.name,
    }));
}

export type IRenameCabinController = ReturnType<typeof renameCabinController>;
/**
 * Renombra una Cabina de la Sucursal del Dueño.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no tiene la forma esperada
 */
export const renameCabinController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        renameCabinUseCase: IRenameCabinUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'renameCabin Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = renameCabinSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await renameCabinUseCase(data), instrumentationService);
        });
