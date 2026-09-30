import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListBusinessesUseCase } from '@/src/application/use-cases/businesses/list-businesses.use-case';
import type { IListEmployeesUseCase } from '@/src/application/use-cases/employees/list-employees.use-case';
import type { Business } from '@/src/entities/models/business';
import type { Employee } from '@/src/entities/models/employee';

function presenter(
    business: Business | undefined,
    employees: Employee[],
    instrumentationService: IInstrumentationService,
) {
    return instrumentationService.startSpan({ name: 'listMyEmployees Presenter', op: 'serialize' }, () => {
        if (!business) return null;
        const isOwner = (employee: Employee) => String(employee.userId) === String(business.ownerId);
        return {
            businessId: business.id,
            employees: employees
                .map((e) => ({ id: e.id, name: e.name, email: e.email, role: isOwner(e) ? ('owner' as const) : ('employee' as const) }))
                .sort((a, b) => Number(b.role === 'owner') - Number(a.role === 'owner')),
        };
    });
}

export type IListMyEmployeesController = ReturnType<typeof listMyEmployeesController>;
// The Empleados of the Negocio the Usuario owns, or null if they have not done Crear Negocio yet.
export const listMyEmployeesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listBusinessesUseCase: IListBusinessesUseCase,
        listEmployeesUseCase: IListEmployeesUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listMyEmployees Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const [business] = await listBusinessesUseCase();
            const employees = business ? await listEmployeesUseCase(business.id) : [];
            return presenter(business, employees, instrumentationService);
        });
