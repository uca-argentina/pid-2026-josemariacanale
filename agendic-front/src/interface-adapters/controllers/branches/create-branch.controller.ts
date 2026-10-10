import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICreateBranchUseCase } from '@/src/application/use-cases/branches/create-branch.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { createBranchSchema, type Branch } from '@/src/entities/models/branch';

function presenter(branch: Branch, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'createBranch Presenter', op: 'serialize' }, () => ({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        timeZone: branch.timeZone,
        slug: branch.slug,
        description: branch.description,
    }));
}

export type ICreateBranchController = ReturnType<typeof createBranchController>;
/**
 * Crea una Sucursal del Negocio del Dueño.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no tiene la forma esperada
 */
export const createBranchController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        createBranchUseCase: ICreateBranchUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'createBranch Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = createBranchSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await createBranchUseCase(data), instrumentationService);
        });
