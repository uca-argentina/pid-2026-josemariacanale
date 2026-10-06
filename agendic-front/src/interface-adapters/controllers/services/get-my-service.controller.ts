import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetAvailabilityUseCase } from '@/src/application/use-cases/availabilities/get-availability.use-case';
import type { IListAvailabilitiesUseCase } from '@/src/application/use-cases/availabilities/list-availabilities.use-case';
import type { IListEmployeesUseCase } from '@/src/application/use-cases/employees/list-employees.use-case';
import type { IGetMyServiceUseCase } from '@/src/application/use-cases/services/get-my-service.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { AvailabilityDetail } from '@/src/entities/models/availability';
import type { Employee } from '@/src/entities/models/employee';
import type { ServiceInCatalog } from '@/src/entities/models/service';

/**
 * Everything the detail edits, plus its Negocio and Sucursal; `offeredByMe` as in the list. `staff` is the Negocio's
 * Staff for the Dueño, who picks from it who attends the Servicio; null for an Empleado. `availabilities` are the
 * Usuario's own, and `myAvailabilityId` the one they attend the Servicio with; both null when they do not attend it.
 */
function presenter(
    { group, branch, service }: ServiceInCatalog,
    staff: Employee[] | null,
    myAvailabilityId: number | null,
    availabilities: AvailabilityDetail[] | null,
    instrumentationService: IInstrumentationService,
) {
    return instrumentationService.startSpan({ name: 'getMyService Presenter', op: 'serialize' }, () => ({
        business: { id: group.business.id, name: group.business.name, slug: group.business.slug },
        role: group.role,
        employeeId: group.employeeId,
        branch: { id: branch.id, name: branch.name, slug: branch.slug },
        service: {
            id: service.id,
            branchId: service.branchId,
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
            offeredByMe: service.employees.some((e) => e.id === group.employeeId),
            employees: service.employees.map((e) => ({ id: e.id, name: e.name })),
        },
        staff: staff && staff.map((e) => ({ id: e.id, name: e.name })),
        myAvailabilityId,
        availabilities:
            availabilities &&
            availabilities.map((a) => ({
                id: a.id,
                name: a.name,
                isDefault: a.isDefault,
                schedule: a.schedule.map((day) => day.map(({ start, end }) => ({ start, end }))),
            })),
    }));
}

/** The id comes from the path of the page, as text. */
const inputSchema = z.object({ serviceId: z.coerce.number().int().positive() });

export type IGetMyServiceController = ReturnType<typeof getMyServiceController>;
/**
 * The detail of a Servicio of the panel, looked up in the Usuario's catalog, with the Staff when the Usuario is its Dueño
 * and their own Availability when they attend it.
 *
 * @throws {UnauthenticatedError} there is no Sesión
 * @throws {InputParseError} the id of the path is not a Servicio id
 * @throws {NotFoundError} the Servicio is not in the Usuario's catalog
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
    ) =>
    async (input: { serviceId?: unknown }): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getMyService Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            const found = await getMyServiceUseCase(data);
            const { group, service } = found;
            const mine = service.employees.find((e) => e.id === group.employeeId);
            const [staff, availabilities] = await Promise.all([
                group.role === 'owner' ? listEmployeesUseCase(group.business.id) : null,
                mine ? listAvailabilitiesUseCase().then((list) => Promise.all(list.map((a) => getAvailabilityUseCase(a.id)))) : null,
            ]);
            return presenter(found, staff, mine?.availabilityId ?? null, availabilities, instrumentationService);
        });
