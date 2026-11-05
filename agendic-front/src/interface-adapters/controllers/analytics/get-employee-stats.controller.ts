import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetEmployeeStatsUseCase } from '@/src/application/use-cases/analytics/get-employee-stats.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { employeeStatsQuerySchema, type EmployeeStats } from '@/src/entities/models/analytics';

function presenter({ attended, employeeNoShows, rescheduled, cancelled }: EmployeeStats, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getEmployeeStats Presenter', op: 'serialize' }, () => ({
        attended,
        employeeNoShows,
        rescheduled,
        cancelled,
    }));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IGetEmployeeStatsController = ReturnType<typeof getEmployeeStatsController>;

/**
 * Las estadísticas de un Empleado en un Negocio y un período, para el Sheet de su perfil. Los conteos van crudos: la UI les da formato.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el Negocio, el Empleado o el rango no son válidos
 * @throws {UnauthorizedError} no es Empleado del Negocio, o pide a otro Empleado sin ser el Dueño
 * @throws {NotFoundError} el Negocio o el Empleado no existen
 */
export const getEmployeeStatsController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        getEmployeeStatsUseCase: IGetEmployeeStatsUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getEmployeeStats Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = employeeStatsQuerySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid employee stats query', { cause: error });
            return presenter(await getEmployeeStatsUseCase(data), instrumentationService);
        });
