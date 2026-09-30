import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetPublicBranchUseCase, PublicBranch } from '@/src/application/use-cases/businesses/get-public-branch.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { slugSchema } from '@/src/entities/models/business';

function presenter({ business, branch, branches, services, employees }: PublicBranch, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getPublicBranch Presenter', op: 'serialize' }, () => ({
        business: { name: business.name, description: business.description, slug: business.slug },
        branch: {
            id: branch.id,
            name: branch.name,
            address: branch.address,
            opensAt: branch.opensAt,
            closesAt: branch.closesAt,
            slug: branch.slug,
        },
        otherBranches: branches
            .filter((b) => b.id !== branch.id)
            .map((b) => ({ id: b.id, name: b.name, address: b.address, slug: b.slug })),
        services: services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            category: s.category,
            durationMinutes: s.durationMinutes,
            price: s.price,
            depositPercent: s.depositPercent,
            employees: s.employees.map((e) => ({ id: e.id, name: e.name })),
        })),
        employees: employees.map((e) => ({ id: e.id, name: e.name })),
    }));
}

const inputSchema = z.object({ businessSlug: slugSchema, branchSlug: slugSchema });

export type IGetPublicBranchController = ReturnType<typeof getPublicBranchController>;
// Public: the page of an Enlace de reserva does not depend on a Sesión, so there is no authentication.
export const getPublicBranchController =
    (instrumentationService: IInstrumentationService, getPublicBranchUseCase: IGetPublicBranchUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getPublicBranch Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Enlace de reserva', { cause: error });
            return presenter(await getPublicBranchUseCase(data), instrumentationService);
        });
