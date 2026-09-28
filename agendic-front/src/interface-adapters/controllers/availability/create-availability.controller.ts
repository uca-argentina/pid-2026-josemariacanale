import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ICreateAvailabilityUseCase } from '@/src/application/use-cases/availability/create-availability.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { availabilitySchema, Availability } from '@/src/entities/models/availability';
import { z } from 'zod';

const inputSchema = z.object({
    employeeId: z.number(),
    data: availabilitySchema.omit({ id: true, isDefault: true }),
});

function presenter(availability: Availability, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'createAvailability Presenter', op: 'serialize' }, () => ({
        id: availability.id,
        name: availability.name,
        isDefault: availability.isDefault,
        days: availability.days,
        overrides: availability.overrides,
    }));
}

export type ICreateAvailabilityController = ReturnType<typeof createAvailabilityController>;
export const createAvailabilityController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        createAvailabilityUseCase: ICreateAvailabilityUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'createAvailability Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await createAvailabilityUseCase(data.employeeId, data.data), instrumentationService);
        });
