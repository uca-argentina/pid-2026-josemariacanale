import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetEmployeesPerPeriodUseCase } from '@/src/application/use-cases/analytics/get-employees-per-period.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { employeesPerPeriodQuerySchema, type EmployeesPerPeriod, type Granularity } from '@/src/entities/models/analytics';
import { formatBucket } from '@/src/interface-adapters/presenters/analytics.presenter';

function presenter({ buckets, rows }: EmployeesPerPeriod, granularity: Granularity, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getEmployeesPerPeriod Presenter', op: 'serialize' }, () => ({
        labels: buckets.map((bucket) => formatBucket(bucket, granularity)),
        rows: rows.map(({ employeeId, name, imageUrl, counts }) => ({ id: employeeId, name, imageUrl, counts })),
    }));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IGetEmployeesPerPeriodController = ReturnType<typeof getEmployeesPerPeriodController>;

/**
 * La tabla "Turnos por Empleado y período" de un Negocio, solo para el Dueño. Los conteos van crudos: la UI muestra el 0 vacío y el CSV los necesita así.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} el rango, la agrupación o un filtro no son válidos
 * @throws {UnauthorizedError} no es el Dueño del Negocio
 * @throws {NotFoundError} el Negocio, la Sucursal o el Servicio no existen
 */
export const getEmployeesPerPeriodController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        getEmployeesPerPeriodUseCase: IGetEmployeesPerPeriodUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getEmployeesPerPeriod Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = employeesPerPeriodQuerySchema.safeParse(input);
            if (error) throw new InputParseError('Invalid employees per period query', { cause: error });
            return presenter(await getEmployeesPerPeriodUseCase(data), data.granularity, instrumentationService);
        });
