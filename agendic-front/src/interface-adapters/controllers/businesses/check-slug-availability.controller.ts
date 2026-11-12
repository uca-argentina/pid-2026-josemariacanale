import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICheckSlugAvailabilityUseCase } from '@/src/application/use-cases/businesses/check-slug-availability.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { SlugAvailability } from '@/src/entities/models/business';

const inputSchema = z.string().trim().toLowerCase().min(1);

export type ICheckSlugAvailabilityController = ReturnType<typeof checkSlugAvailabilityController>;
export const checkSlugAvailabilityController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        checkSlugAvailabilityUseCase: ICheckSlugAvailabilityUseCase,
    ) =>
    async (input: unknown): Promise<SlugAvailability> =>
        instrumentationService.startSpan({ name: 'checkSlugAvailability Controller' }, async () => {
            await authenticationService.getCurrentUser(); // throws UnauthenticatedError
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError(`Invalid slug ${JSON.stringify(input)}`, { cause: error });
            return checkSlugAvailabilityUseCase(data);
        });
