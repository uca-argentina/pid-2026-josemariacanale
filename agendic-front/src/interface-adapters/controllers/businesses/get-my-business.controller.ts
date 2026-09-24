import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListBusinessesUseCase } from '@/src/application/use-cases/businesses/list-businesses.use-case';
import type { Business } from '@/src/entities/models/business';

function presenter(business: Business | undefined, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getMyBusiness Presenter', op: 'serialize' }, () =>
        business ? { id: business.id, name: business.name, slug: business.slug } : null,
    );
}

export type IGetMyBusinessController = ReturnType<typeof getMyBusinessController>;
// The Negocio the Usuario owns, or null if they have not done Crear Negocio yet (ADR 0012).
export const getMyBusinessController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listBusinessesUseCase: IListBusinessesUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getMyBusiness Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const [business] = await listBusinessesUseCase();
            return presenter(business, instrumentationService);
        });
