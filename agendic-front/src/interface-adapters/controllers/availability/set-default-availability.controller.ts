import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ISetDefaultAvailabilityUseCase } from '@/src/application/use-cases/availability/set-default-availability.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { Availability } from '@/src/entities/models/availability';
import { z } from 'zod';

const inputSchema = z.object({
    id: z.string(),
});

function presenter(availability: Availability, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'setDefaultAvailability Presenter', op: 'serialize' }, () => ({
        id: availability.id,
        name: availability.name,
        isDefault: availability.isDefault,
        days: availability.days,
        overrides: availability.overrides,
    }));
}

export type ISetDefaultAvailabilityController = ReturnType<typeof setDefaultAvailabilityController>;
export const setDefaultAvailabilityController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        setDefaultAvailabilityUseCase: ISetDefaultAvailabilityUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'setDefaultAvailability Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await setDefaultAvailabilityUseCase(data.id), instrumentationService);
        });
