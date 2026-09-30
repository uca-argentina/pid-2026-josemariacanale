import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetPublicBusinessUseCase } from '@/src/application/use-cases/businesses/get-public-business.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Branch } from '@/src/entities/models/branch';
import { slugSchema, type Business } from '@/src/entities/models/business';

function presenter({ business, branches }: { business: Business; branches: Branch[] }, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getPublicBusiness Presenter', op: 'serialize' }, () => ({
        business: { name: business.name, description: business.description, slug: business.slug },
        branches: branches.map((b) => ({ id: b.id, name: b.name, address: b.address, slug: b.slug })),
    }));
}

const inputSchema = z.object({ businessSlug: slugSchema });

export type IGetPublicBusinessController = ReturnType<typeof getPublicBusinessController>;
// Public: the page of an Enlace de reserva does not depend on a Sesión, so there is no authentication.
export const getPublicBusinessController =
    (instrumentationService: IInstrumentationService, getPublicBusinessUseCase: IGetPublicBusinessUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getPublicBusiness Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Enlace de reserva', { cause: error });
            return presenter(await getPublicBusinessUseCase(data), instrumentationService);
        });
