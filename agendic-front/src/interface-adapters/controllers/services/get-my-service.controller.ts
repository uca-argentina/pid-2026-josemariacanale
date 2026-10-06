import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetAvailabilityUseCase } from '@/src/application/use-cases/availabilities/get-availability.use-case';
import type { IListAvailabilitiesUseCase } from '@/src/application/use-cases/availabilities/list-availabilities.use-case';
import type { IListEmployeesUseCase } from '@/src/application/use-cases/employees/list-employees.use-case';
import type { IGetMyServiceUseCase } from '@/src/application/use-cases/services/get-my-service.use-case';
import type { IGetMeUseCase } from '@/src/application/use-cases/users/get-me.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { AvailabilityDetail } from '@/src/entities/models/availability';
import type { Employee } from '@/src/entities/models/employee';
import type { CatalogService, PersonalService, ServiceInCatalog } from '@/src/entities/models/service';

/** Everything the detail edits of a Servicio, del Negocio or personal. */
const presentService = (service: CatalogService | PersonalService, offeredByMe: boolean) => ({
    id: service.id,
    slug: service.slug,
    name: service.name,
    description: service.description,
    category: service.category,
    durationMinutes: service.durationMinutes,
    price: service.price,
    depositPercent: service.depositPercent,
    requiresApproval: service.requiresApproval,
    hidden: service.hidden,
    prepMinutes: service.prepMinutes,
    dailyLimit: service.dailyLimit,
    slotInterval: service.slotInterval,
    minimumNoticeMinutes: service.minimumNoticeMinutes,
    offeredByMe,
    employees: 'employees' in service ? service.employees.map((e) => ({ id: e.id, name: e.name })) : [],
});

const presentAvailabilities = (availabilities: AvailabilityDetail[] | null) =>
    availabilities &&
    availabilities.map((a) => ({
        id: a.id,
        name: a.name,
        isDefault: a.isDefault,
        schedule: a.schedule.map((day) => day.map(({ start, end }) => ({ start, end }))),
    }));

/**
 * A Servicio del Negocio (`kind: 'business'`) with its Negocio and Sucursal; `offeredByMe` as in the list. `staff` is
 * the Negocio's Staff for the Dueño, who picks from it who attends the Servicio; null for an Empleado. `availabilities`
 * are the Usuario's own, and `myAvailabilityId` the one they attend the Servicio with; both null when they do not
 * attend it.
 */
function presenter(
    { group, branch, service }: ServiceInCatalog,
    staff: Employee[] | null,
    myAvailabilityId: number | null,
    availabilities: AvailabilityDetail[] | null,
    instrumentationService: IInstrumentationService,
) {
    return instrumentationService.startSpan({ name: 'getMyService Presenter', op: 'serialize' }, () => ({
        kind: 'business' as const,
        business: { id: group.business.id, name: group.business.name, slug: group.business.slug },
        role: group.role,
        employeeId: group.employeeId,
        branch: { id: branch.id, name: branch.name, slug: branch.slug },
        service: presentService(service, service.employees.some((e) => e.id === group.employeeId)),
        staff: staff && staff.map((e) => ({ id: e.id, name: e.name })),
        myAvailabilityId,
        availabilities: presentAvailabilities(availabilities),
    }));
}

/**
 * A Servicio personal (`kind: 'personal'`): the Usuario edits all of it and attends it with `myAvailabilityId`, one of
 * their `availabilities`. `userSlug` is their Enlace de reserva, null until they pick one.
 */
function personalPresenter(
    service: PersonalService,
    userSlug: string | null,
    availabilities: AvailabilityDetail[],
    instrumentationService: IInstrumentationService,
) {
    return instrumentationService.startSpan({ name: 'getMyService Presenter', op: 'serialize' }, () => ({
        kind: 'personal' as const,
        userSlug,
        role: 'owner' as const,
        service: presentService(service, true),
        staff: null,
        myAvailabilityId: service.availabilityId,
        availabilities: presentAvailabilities(availabilities)!,
    }));
}

/** The id comes from the path of the page, as text. */
const inputSchema = z.object({ serviceId: z.coerce.number().int().positive() });

export type IGetMyServiceController = ReturnType<typeof getMyServiceController>;
/**
 * The detail of a Servicio of the panel, looked up in the Usuario's catalog, with the Staff when the Usuario is its Dueño
 * and their own Availability when they attend it; or among their Servicios personales, with their Availability and
 * their Enlace de reserva.
 *
 * @throws {UnauthenticatedError} there is no Sesión
 * @throws {InputParseError} the id of the path is not a Servicio id
 * @throws {NotFoundError} the Servicio is neither in the Usuario's catalog nor among their Servicios personales
 * @throws {ApiRequestError} the back failed
 */
export const getMyServiceController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        getMyServiceUseCase: IGetMyServiceUseCase,
        listEmployeesUseCase: IListEmployeesUseCase,
        listAvailabilitiesUseCase: IListAvailabilitiesUseCase,
        getAvailabilityUseCase: IGetAvailabilityUseCase,
        getMeUseCase: IGetMeUseCase,
    ) =>
    async (input: { serviceId?: unknown }): Promise<ReturnType<typeof presenter> | ReturnType<typeof personalPresenter>> =>
        instrumentationService.startSpan({ name: 'getMyService Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            const found = await getMyServiceUseCase(data);
            const myAvailabilities = () =>
                listAvailabilitiesUseCase().then((list) => Promise.all(list.map((a) => getAvailabilityUseCase(a.id))));
            if (found.group === null) {
                const [me, availabilities] = await Promise.all([getMeUseCase(), myAvailabilities()]);
                return personalPresenter(found.service, me.slug, availabilities, instrumentationService);
            }
            const { group, service } = found;
            const mine = service.employees.find((e) => e.id === group.employeeId);
            const [staff, availabilities] = await Promise.all([
                group.role === 'owner' ? listEmployeesUseCase(group.business.id) : null,
                mine ? myAvailabilities() : null,
            ]);
            return presenter(found, staff, mine?.availabilityId ?? null, availabilities, instrumentationService);
        });
