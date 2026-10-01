import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRemoveEmployeeUseCase } from '@/src/application/use-cases/services/remove-employee.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { serviceEmployeeRefSchema, type RemovedEmployee } from '@/src/entities/models/service';

function presenter(removed: RemovedEmployee, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'removeEmployee Presenter', op: 'serialize' }, () => ({
        cancelledBookings: removed.cancelledBookings,
    }));
}

export type IRemoveEmployeeController = ReturnType<typeof removeEmployeeController>;
/**
 * Dejar de ofrecer of the list and the detail, for the Usuario's own Empleado, and the Dueño removing any Empleado
 * from the detail.
 *
 * @throws {UnauthenticatedError} there is no Sesión
 * @throws {InputParseError} the Servicio or the Empleado is not an id
 * @throws {LastEmployeeError} the Empleado is the last one attending the Servicio
 * @throws {NotFoundError} the Servicio or the Empleado do not exist
 * @throws {ApiRequestError} not allowed, or the back failed
 */
export const removeEmployeeController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        removeEmployeeUseCase: IRemoveEmployeeUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'removeEmployee Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = serviceEmployeeRefSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await removeEmployeeUseCase(data), instrumentationService);
        });
