import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListBusinessBranchesUseCase } from '@/src/application/use-cases/branches/list-business-branches.use-case';
import type { IListMyBusinessesUseCase } from '@/src/application/use-cases/businesses/list-my-businesses.use-case';
import type { Branch } from '@/src/entities/models/branch';
import type { MyBusiness } from '@/src/entities/models/business';

function presenter(businesses: { business: MyBusiness; branches: Branch[] }[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listMyBusinesses Presenter', op: 'serialize' }, () =>
        businesses.map(({ business: b, branches }) => ({
            id: b.id,
            name: b.name,
            description: b.description,
            slug: b.slug,
            logoUrl: b.logoUrl,
            role: b.role,
            branchIds: b.branchIds,
            branches: branches.map((branch) => ({ id: branch.id, name: branch.name, address: branch.address })),
        })),
    );
}

export type IListMyBusinessesController = ReturnType<typeof listMyBusinessesController>;
/**
 * Los Negocios donde el Usuario es Empleado, con su rol y las Sucursales donde trabaja. Lista vacía si no es
 * Empleado de ninguno: el Usuario que todavía no hizo Crear Negocio (ADR 0012).
 *
 * `branches` son las Sucursales donde trabaja, solo en los Negocios donde es Empleado: las del Dueño se editan en su
 * propia pantalla, y ahí el pedido sobra.
 *
 * @throws {UnauthenticatedError} no hay Sesión
 */
export const listMyBusinessesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listMyBusinessesUseCase: IListMyBusinessesUseCase,
        listBusinessBranchesUseCase: IListBusinessBranchesUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listMyBusinesses Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const businesses = await listMyBusinessesUseCase();
            const withBranches = await Promise.all(
                businesses.map(async (business) => ({
                    business,
                    branches:
                        business.role === 'owner'
                            ? []
                            : (await listBusinessBranchesUseCase(business.id)).filter((branch) => business.branchIds.includes(branch.id)),
                })),
            );
            return presenter(withBranches, instrumentationService);
        });
