import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListAvailabilitiesUseCase } from '@/src/application/use-cases/availabilities/list-availabilities.use-case';
import type { IListPersonalServicesUseCase } from '@/src/application/use-cases/services/list-personal-services.use-case';
import type { IGetMeUseCase } from '@/src/application/use-cases/users/get-me.use-case';
import type { Availability } from '@/src/entities/models/availability';
import type { PersonalService } from '@/src/entities/models/service';
import type { Me } from '@/src/entities/models/user';

/**
 * The Usuario's Enlace de reserva (`slug`, null until they pick one), their Servicios personales, and their
 * Availability to pick from when creating one.
 */
function presenter(
    me: Me,
    services: PersonalService[],
    availabilities: Availability[],
    instrumentationService: IInstrumentationService,
) {
    return instrumentationService.startSpan({ name: 'listMyPersonalServices Presenter', op: 'serialize' }, () => ({
        slug: me.slug,
        services: services.map((s) => ({
            id: s.id,
            slug: s.slug,
            name: s.name,
            description: s.description,
            category: s.category,
            durationMinutes: s.durationMinutes,
            price: s.price,
            hidden: s.hidden,
            availabilityId: s.availabilityId,
        })),
        availabilities: availabilities.map((a) => ({ id: a.id, name: a.name, isDefault: a.isDefault })),
    }));
}

export type IListMyPersonalServicesController = ReturnType<typeof listMyPersonalServicesController>;
/**
 * The section of Servicios personales of the panel's Servicios page, for any Usuario, with or without a Negocio.
 *
 * @throws {UnauthenticatedError} there is no Sesión
 * @throws {ApiRequestError} the back failed
 */
export const listMyPersonalServicesController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listPersonalServicesUseCase: IListPersonalServicesUseCase,
        getMeUseCase: IGetMeUseCase,
        listAvailabilitiesUseCase: IListAvailabilitiesUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listMyPersonalServices Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const [me, services, availabilities] = await Promise.all([
                getMeUseCase(),
                listPersonalServicesUseCase(),
                listAvailabilitiesUseCase(),
            ]);
            return presenter(me, services, availabilities, instrumentationService);
        });
