import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUpdateBusinessUseCase } from '@/src/application/use-cases/businesses/update-business.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { updateBusinessSchema, type Business } from '@/src/entities/models/business';

function presenter(business: Business, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'updateBusiness Presenter', op: 'serialize' }, () => ({
        id: business.id,
        name: business.name,
        description: business.description,
        slug: business.slug,
    }));
}

export type IUpdateBusinessController = ReturnType<typeof updateBusinessController>;
export const updateBusinessController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        updateBusinessUseCase: IUpdateBusinessUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'updateBusiness Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = updateBusinessSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await updateBusinessUseCase(data), instrumentationService);
        });
