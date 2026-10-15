import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetPublicBranchUseCase, PublicBranch } from '@/src/application/use-cases/businesses/get-public-branch.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { slugSchema } from '@/src/entities/models/business';
import type { Service, ServiceEmployee } from '@/src/entities/models/service';

const presentEmployee = (e: ServiceEmployee) => ({ id: e.id, name: e.name, imageUrl: e.imageUrl, slug: e.slug });

const presentService = (s: Service) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    durationMinutes: s.durationMinutes,
    price: s.price,
    depositPercent: s.depositPercent,
    repeatEveryWeeks: s.repeatEveryWeeks,
    repeatMaxBookings: s.repeatMaxBookings,
    employees: s.employees.map(presentEmployee),
});

function presenter(
    { business, branch, branches, services, employees, images, selectedService, selectedEmployee }: PublicBranch,
    instrumentationService: IInstrumentationService,
) {
    return instrumentationService.startSpan({ name: 'getPublicBranch Presenter', op: 'serialize' }, () => ({
        business: { name: business.name, description: business.description, slug: business.slug, logoUrl: business.logoUrl },
        branch: {
            id: branch.id,
            name: branch.name,
            address: branch.address,
            timeZone: branch.timeZone,
            slug: branch.slug,
            description: branch.description ?? business.description,
        },
        otherBranches: branches
            .filter((b) => b.id !== branch.id)
            .map((b) => ({ id: b.id, name: b.name, address: b.address, slug: b.slug })),
        services: services.map(presentService),
        employees: employees.map(presentEmployee),
        images: images.map((i) => ({ id: i.id, url: i.url })),
        selectedService: selectedService ? presentService(selectedService) : null,
        selectedEmployee: selectedEmployee ? presentEmployee(selectedEmployee) : null,
    }));
}

/**
 * The Servicio tramo is optional: without it, the page of the Sucursal with no Servicio chosen yet. The Empleado tramo
 * (ADR 0026) is optional too, and only makes sense after a Servicio one.
 */
const inputSchema = z
    .object({ businessSlug: slugSchema, branchSlug: slugSchema, serviceSlug: slugSchema.optional(), employeeSlug: slugSchema.optional() })
    .refine((input) => !input.employeeSlug || input.serviceSlug, 'An Empleado tramo needs a Servicio tramo');

export type IGetPublicBranchController = ReturnType<typeof getPublicBranchController>;
/**
 * The page of a Sucursal by its Enlace de reserva. Public: it does not depend on a Sesión, so there is no
 * authentication. The Sucursal's own description replaces the Negocio's on its page.
 *
 * @throws {InputParseError} a tramo of the Enlace de reserva is not valid
 */
export const getPublicBranchController =
    (instrumentationService: IInstrumentationService, getPublicBranchUseCase: IGetPublicBranchUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getPublicBranch Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Enlace de reserva', { cause: error });
            return presenter(await getPublicBranchUseCase(data), instrumentationService);
        });
