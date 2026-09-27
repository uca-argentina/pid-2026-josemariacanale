import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type {
    IGetPublicBusinessUseCase,
    PublicBusinessResult,
} from '@/src/application/use-cases/businesses/get-public-business.use-case';
import { InputParseError } from '@/src/entities/errors/common';

function presenter(data: PublicBusinessResult, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getPublicBusiness Presenter', op: 'serialize' }, () => {
        const { business, branches, services } = data;
        const mainBranch = branches[0] ?? null;

        return {
            business: {
                id: business.id,
                name: business.name,
                description: business.description,
                slug: business.slug,
            },
            branch: mainBranch
                ? {
                      id: mainBranch.id,
                      businessId: mainBranch.businessId,
                      name: mainBranch.name,
                      address: mainBranch.address,
                      opensAt: mainBranch.opensAt,
                      closesAt: mainBranch.closesAt,
                  }
                : null,
            branches: branches.map((b) => ({
                id: b.id,
                businessId: b.businessId,
                name: b.name,
                address: b.address,
                opensAt: b.opensAt,
                closesAt: b.closesAt,
            })),
            services: services.map((s) => ({
                id: s.id,
                branchId: s.branchId,
                name: s.name,
                description: s.description ?? undefined,
                category: s.category,
                durationMinutes: s.durationMinutes,
                price: s.price,
                employees: s.employees.map((e) => ({ id: e.id, name: e.name })),
            })),
        };
    });
}

const inputSchema = z.object({
    slug: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
        .min(3)
        .max(40),
});

export type IGetPublicBusinessController = ReturnType<typeof getPublicBusinessController>;
export const getPublicBusinessController =
    (
        instrumentationService: IInstrumentationService,
        getPublicBusinessUseCase: IGetPublicBusinessUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getPublicBusiness Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid slug', { cause: error });
            const result = await getPublicBusinessUseCase(data.slug);
            return presenter(result, instrumentationService);
        });
