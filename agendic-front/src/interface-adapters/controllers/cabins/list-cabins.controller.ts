import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListCabinsUseCase } from '@/src/application/use-cases/cabins/list-cabins.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Cabin } from '@/src/entities/models/cabin';

function presenter(cabins: Cabin[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listCabins Presenter', op: 'serialize' }, () =>
        cabins.map((cabin) => ({ id: cabin.id, branchId: cabin.branchId, name: cabin.name })),
    );
}

const inputSchema = z.object({ branchId: z.number() });

export type IListCabinsController = ReturnType<typeof listCabinsController>;
/**
 * Lista las Cabinas activas de una Sucursal para el panel del Dueño, ordenadas por nombre.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no tiene la forma esperada
 */
export const listCabinsController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listCabinsUseCase: IListCabinsUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listCabins Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await listCabinsUseCase(data.branchId), instrumentationService);
        });
