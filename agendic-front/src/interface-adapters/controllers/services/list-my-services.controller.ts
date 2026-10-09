import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListMyServicesUseCase } from '@/src/application/use-cases/services/list-my-services.use-case';
import type { ServiceCatalogGroup } from '@/src/entities/models/service';

/** Shapes each group for the panel: `offeredByMe` says whether the Usuario's own Empleado attends the Servicio. */
function presenter(groups: ServiceCatalogGroup[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listMyServices Presenter', op: 'serialize' }, () =>
        groups.map((group) => ({
            business: { id: group.business.id, name: group.business.name, slug: group.business.slug },
            role: group.role,
            employeeId: group.employeeId,
            branches: group.branches.map((branch) => ({
                id: branch.id,
                name: branch.name,
                slug: branch.slug,
                services: branch.services.map((s) => ({
                    id: s.id,
                    branchId: s.branchId,
                    slug: s.slug,
                    name: s.name,
                    description: s.description,
                    category: s.category,
                    durationMinutes: s.durationMinutes,
                    price: s.price,
                    hidden: s.hidden,
                    offeredByMe: s.employees.some((e) => e.id === group.employeeId),
                    employees: s.employees.map((e) => ({ id: e.id, name: e.name, imageUrl: e.imageUrl })),
                })),
            })),
        })),
    );
}

export type IListMyServicesController = ReturnType<typeof listMyServicesController>;
/**
 * The page of Servicios of the panel: the Usuario's catalog, one group per Negocio where they are an active Empleado.
 *
 * @throws {UnauthenticatedError} there is no Sesión
 * @throws {ApiRequestError} the back failed
 */
export const listMyServicesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listMyServicesUseCase: IListMyServicesUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listMyServices Controller' }, async () => {
            await authenticationService.getCurrentUser();
            return presenter(await listMyServicesUseCase(), instrumentationService);
        });
