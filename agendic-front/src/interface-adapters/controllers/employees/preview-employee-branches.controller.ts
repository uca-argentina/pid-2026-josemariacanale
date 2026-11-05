import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IPreviewEmployeeBranchesUseCase } from '@/src/application/use-cases/employees/preview-employee-branches.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { employeeBranchesSchema, type BranchCancelledBooking } from '@/src/entities/models/employee';

function presenter(bookings: BranchCancelledBooking[]) {
    return bookings.map((b) => ({
        id: b.id,
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        timeZone: b.timeZone,
        serviceName: b.serviceName,
        clientName: b.clientName,
        branch: { id: b.branch.id, name: b.branch.name },
    }));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IPreviewEmployeeBranchesController = ReturnType<typeof previewEmployeeBranchesController>;

/**
 * Los Turnos que cambiar las Sucursales de un Empleado cancelaría, para que el Dueño los confirme.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el Empleado o las Sucursales no son ids
 * @throws los errores de `previewEmployeeBranchesUseCase`
 */
export const previewEmployeeBranchesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        previewEmployeeBranchesUseCase: IPreviewEmployeeBranchesUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'previewEmployeeBranches Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = employeeBranchesSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Sucursales of the Empleado', { cause: error });
            const bookings = await previewEmployeeBranchesUseCase(data);
            return instrumentationService.startSpan({ name: 'previewEmployeeBranches Presenter', op: 'serialize' }, () => presenter(bookings));
        });
