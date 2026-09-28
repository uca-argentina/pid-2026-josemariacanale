import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IUpdateAvailabilityUseCase } from '@/src/application/use-cases/availability/update-availability.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { availabilitySchema, Availability } from '@/src/entities/models/availability';
import { z } from 'zod';

const inputSchema = z.object({
    id: z.string(),
    data: availabilitySchema.omit({ id: true, isDefault: true }),
});

function presenter(availability: Availability, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'updateAvailability Presenter', op: 'serialize' }, () => ({
        id: availability.id,
        name: availability.name,
        isDefault: availability.isDefault,
        days: availability.days,
        overrides: availability.overrides,
    }));
}

export type IUpdateAvailabilityController = ReturnType<typeof updateAvailabilityController>;
export const updateAvailabilityController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        updateAvailabilityUseCase: IUpdateAvailabilityUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'updateAvailability Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await updateAvailabilityUseCase(data.id, data.data), instrumentationService);
        });
