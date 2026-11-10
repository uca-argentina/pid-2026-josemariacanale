import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IChangeEmployeeBranchesUseCase } from '@/src/application/use-cases/employees/change-employee-branches.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { confirmedEmployeeBranchesSchema } from '@/src/entities/models/employee';

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IChangeEmployeeBranchesController = ReturnType<typeof changeEmployeeBranchesController>;

/**
 * Cambia las Sucursales de un Empleado y cancela los Turnos que el Dueño confirmó.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el Empleado, las Sucursales o los Turnos no son ids
 * @throws los errores de `changeEmployeeBranchesUseCase`
 */
export const changeEmployeeBranchesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        changeEmployeeBranchesUseCase: IChangeEmployeeBranchesUseCase,
    ) =>
    async (input: unknown): Promise<{ cancelledBookings: number }> =>
        instrumentationService.startSpan({ name: 'changeEmployeeBranches Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = confirmedEmployeeBranchesSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Sucursales of the Empleado', { cause: error });
            const { cancelledBookings } = await changeEmployeeBranchesUseCase(data);
            return { cancelledBookings };
        });
