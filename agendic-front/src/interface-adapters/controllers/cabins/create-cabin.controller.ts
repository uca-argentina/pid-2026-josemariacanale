import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICreateCabinUseCase } from '@/src/application/use-cases/cabins/create-cabin.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { createCabinSchema, type Cabin } from '@/src/entities/models/cabin';

function presenter(cabin: Cabin, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'createCabin Presenter', op: 'serialize' }, () => ({
        id: cabin.id,
        branchId: cabin.branchId,
        name: cabin.name,
    }));
}

export type ICreateCabinController = ReturnType<typeof createCabinController>;
/**
 * Agrega una Cabina a la Sucursal del Dueño.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no tiene la forma esperada
 */
export const createCabinController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        createCabinUseCase: ICreateCabinUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'createCabin Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = createCabinSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await createCabinUseCase(data), instrumentationService);
        });
