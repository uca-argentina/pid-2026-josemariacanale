import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListMyBusinessesUseCase } from '@/src/application/use-cases/businesses/list-my-businesses.use-case';
import type { MyBusiness } from '@/src/entities/models/business';

function presenter(businesses: MyBusiness[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listMyBusinesses Presenter', op: 'serialize' }, () =>
        businesses.map((b) => ({
            id: b.id,
            name: b.name,
            description: b.description,
            slug: b.slug,
            logoUrl: b.logoUrl,
            role: b.role,
            branchIds: b.branchIds,
        })),
    );
}

export type IListMyBusinessesController = ReturnType<typeof listMyBusinessesController>;
/**
 * Los Negocios donde el Usuario es Empleado, con su rol y las Sucursales donde trabaja. Lista vacía si no es
 * Empleado de ninguno: el Usuario que todavía no hizo Crear Negocio (ADR 0012).
 *
 * @throws {UnauthenticatedError} no hay Sesión
 */
export const listMyBusinessesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listMyBusinessesUseCase: IListMyBusinessesUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listMyBusinesses Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            return presenter(await listMyBusinessesUseCase(), instrumentationService);
        });
