import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUpdateBranchUseCase } from '@/src/application/use-cases/branches/update-branch.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { updateBranchSchema, type Branch } from '@/src/entities/models/branch';

function presenter(branch: Branch, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'updateBranch Presenter', op: 'serialize' }, () => ({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        timeZone: branch.timeZone,
        slug: branch.slug,
        description: branch.description,
    }));
}

export type IUpdateBranchController = ReturnType<typeof updateBranchController>;
/**
 * Edita una Sucursal del Negocio del Dueño.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no tiene la forma esperada
 */
export const updateBranchController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        updateBranchUseCase: IUpdateBranchUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'updateBranch Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = updateBranchSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await updateBranchUseCase(data), instrumentationService);
        });
