import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IAssignEmployeeUseCase } from '@/src/application/use-cases/services/assign-employee.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { serviceEmployeeRefSchema, type CatalogService } from '@/src/entities/models/service';

/** The Servicio's name, for the confirmation, and who attends it now. */
function presenter(service: CatalogService, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'assignEmployee Presenter', op: 'serialize' }, () => ({
        name: service.name,
        employees: service.employees.map((e) => ({ id: e.id, name: e.name })),
    }));
}

export type IAssignEmployeeController = ReturnType<typeof assignEmployeeController>;
/**
 * Ofrecer of the list and the detail, for the Usuario's own Empleado, and the Dueño adding another Empleado of the
 * Staff from the detail.
 *
 * @throws {UnauthenticatedError} there is no Sesión
 * @throws {InputParseError} the Servicio or the Empleado is not an id
 * @throws {EmployeeNotAssignableError} the Empleado is not of the Negocio or was dado de baja
 * @throws {NotFoundError} the Servicio or the Empleado do not exist
 * @throws {ApiRequestError} not allowed, already offered, or the back failed
 */
export const assignEmployeeController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        assignEmployeeUseCase: IAssignEmployeeUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'assignEmployee Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = serviceEmployeeRefSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await assignEmployeeUseCase(data), instrumentationService);
        });
