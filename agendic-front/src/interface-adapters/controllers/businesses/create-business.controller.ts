import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICreateBusinessUseCase } from '@/src/application/use-cases/businesses/create-business.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { createBusinessSchema, type Business } from '@/src/entities/models/business';

function presenter(business: Business, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'createBusiness Presenter', op: 'serialize' }, () => ({
        id: business.id,
        name: business.name,
        slug: business.slug,
    }));
}

export type ICreateBusinessController = ReturnType<typeof createBusinessController>;
export const createBusinessController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        createBusinessUseCase: ICreateBusinessUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'createBusiness Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = createBusinessSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await createBusinessUseCase(data), instrumentationService);
        });
