import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListEmployeesUseCase } from '@/src/application/use-cases/employees/list-employees.use-case';
import type { IListInvitationsUseCase } from '@/src/application/use-cases/employees/list-invitations.use-case';
import type { IListBusinessBranchesUseCase } from '@/src/application/use-cases/branches/list-business-branches.use-case';
import type { IListMyBusinessesUseCase } from '@/src/application/use-cases/businesses/list-my-businesses.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Branch } from '@/src/entities/models/branch';
import type { Employee, Invitation } from '@/src/entities/models/employee';
import type { User } from '@/src/entities/models/user';

function presenter(
    businessId: number,
    viewerIsOwner: boolean,
    employees: Employee[],
    invitations: Invitation[],
    branches: Branch[],
    user: User,
    instrumentationService: IInstrumentationService,
) {
    return instrumentationService.startSpan({ name: 'listBusinessStaff Presenter', op: 'serialize' }, () => {
        // ponytail: el back no vincula Empleado con Usuario; el Dueño se reconoce por email hasta que lo haga.
        const isOwner = (employee: Employee) => employee.email.toLowerCase() === user.email.toLowerCase();
        const branchNames = (branchIds: number[]) => branches.filter((b) => branchIds.includes(b.id)).map((b) => b.name);
        return {
            businessId,
            viewerIsOwner,
            employees: employees
                .map((e) => ({
                    id: e.id,
                    name: e.name,
                    email: e.email,
                    imageUrl: e.imageUrl,
                    badges: e.badges,
                    branchIds: e.branchIds,
                    branchNames: branchNames(e.branchIds),
                    role: isOwner(e) ? ('owner' as const) : ('employee' as const),
                }))
                .sort((a, b) => Number(b.role === 'owner') - Number(a.role === 'owner')),
            invitations: invitations.map((i) => ({ id: i.id, email: i.email, expiresAt: i.expiresAt, branchNames: branchNames(i.branchIds) })),
            branches: branches.map((b) => ({ id: b.id, name: b.name })),
        };
    });
}

const inputSchema = z.object({ businessId: z.number() });

export type IListBusinessStaffController = ReturnType<typeof listBusinessStaffController>;
/**
 * El Staff de un Negocio donde el Usuario es Empleado, o null si no lo es, con los nombres de las Sucursales donde
 * trabaja cada uno. Las Invitaciones pendientes son solo del Dueño: a un Empleado no se le piden. `branches` son las
 * del Negocio, para elegir dónde va a trabajar una persona invitada.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 * @throws {InputParseError} el input no tiene la forma esperada
 */
export const listBusinessStaffController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listMyBusinessesUseCase: IListMyBusinessesUseCase,
        listEmployeesUseCase: IListEmployeesUseCase,
        listInvitationsUseCase: IListInvitationsUseCase,
        listBusinessBranchesUseCase: IListBusinessBranchesUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter> | null> =>
        instrumentationService.startSpan({ name: 'listBusinessStaff Controller' }, async () => {
            const user = await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            const business = (await listMyBusinessesUseCase()).find((b) => b.id === data.businessId);
            if (!business) return null;
            const viewerIsOwner = business.role === 'owner';
            const [employees, invitations, branches] = await Promise.all([
                listEmployeesUseCase(business.id),
                viewerIsOwner ? listInvitationsUseCase(business.id) : [],
                listBusinessBranchesUseCase(business.id),
            ]);
            return presenter(business.id, viewerIsOwner, employees, invitations, branches, user, instrumentationService);
        });
