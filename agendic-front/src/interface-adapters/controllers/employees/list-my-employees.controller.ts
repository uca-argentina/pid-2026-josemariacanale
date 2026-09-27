import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListBusinessesUseCase } from '@/src/application/use-cases/businesses/list-businesses.use-case';
import type { IListEmployeesUseCase } from '@/src/application/use-cases/employees/list-employees.use-case';
import type { Business } from '@/src/entities/models/business';
import type { Employee } from '@/src/entities/models/employee';
import type { User } from '@/src/entities/models/user';

function presenter(
    business: Business | undefined,
    employees: Employee[],
    user: User,
    instrumentationService: IInstrumentationService,
) {
    return instrumentationService.startSpan({ name: 'listMyEmployees Presenter', op: 'serialize' }, () => {
        if (!business) return null;
        // ponytail: el back no vincula Empleado con Usuario; el Dueño se reconoce por email hasta que lo haga.
        const isOwner = (employee: Employee) => employee.email.toLowerCase() === user.email.toLowerCase();
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
            const user = await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const [business] = await listBusinessesUseCase();
            const employees = business ? await listEmployeesUseCase(business.id) : [];
            return presenter(business, employees, user, instrumentationService);
        });
