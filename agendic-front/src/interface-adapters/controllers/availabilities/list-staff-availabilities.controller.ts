import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListAvailabilitiesUseCase } from '@/src/application/use-cases/availabilities/list-availabilities.use-case';
import type { IListBusinessesUseCase } from '@/src/application/use-cases/businesses/list-businesses.use-case';
import type { IListEmployeesUseCase } from '@/src/application/use-cases/employees/list-employees.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Availability } from '@/src/entities/models/availability';
import type { Employee } from '@/src/entities/models/employee';

const inputSchema = z.object({ employeeId: z.number().int().positive().optional() });

function presenter(
    employees: Employee[],
    employee: Employee,
    ownerId: string,
    availabilities: Availability[],
    instrumentationService: IInstrumentationService,
) {
    return instrumentationService.startSpan({ name: 'listStaffAvailabilities Presenter', op: 'serialize' }, () => ({
        employees: employees.map((e) => ({ id: e.id, name: e.name, isOwner: String(e.userId) === ownerId })),
        employeeId: employee.id,
        availabilities: availabilities.map((a) => ({
            id: a.id,
            name: a.name,
            isDefault: a.isDefault,
            intervals: a.intervals.map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime })),
        })),
    }));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IListStaffAvailabilitiesController = ReturnType<typeof listStaffAvailabilitiesController>;

/**
 * Las Availability de un Empleado del Staff del Negocio del Dueño, junto con el Staff para elegir otro.
 *
 * Sin `employeeId`, o con uno que no es del Staff, abre en el Empleado del propio Dueño. Devuelve
 * `null` si el Usuario todavía no hizo Crear Negocio.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `employeeId` no es válido
 */
export const listStaffAvailabilitiesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listBusinessesUseCase: IListBusinessesUseCase,
        listEmployeesUseCase: IListEmployeesUseCase,
        listAvailabilitiesUseCase: IListAvailabilitiesUseCase,
    ) =>
    async (input: unknown = {}): Promise<ReturnType<typeof presenter> | null> =>
        instrumentationService.startSpan({ name: 'listStaffAvailabilities Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });

            const [business] = await listBusinessesUseCase();
            if (!business) return null;
            const ownerId = String(business.ownerId);
            const employees = await listEmployeesUseCase(business.id);
            const employee =
                employees.find((e) => e.id === data.employeeId) ??
                employees.find((e) => String(e.userId) === ownerId) ??
                employees[0];
            if (!employee) return null;

            const availabilities = await listAvailabilitiesUseCase(employee.id);
            return presenter(employees, employee, ownerId, availabilities, instrumentationService);
        });
