import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IDeleteAvailabilityUseCase } from '@/src/application/use-cases/availability/delete-availability.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import { z } from 'zod';

const inputSchema = z.object({
    id: z.string(),
});

export type IDeleteAvailabilityController = ReturnType<typeof deleteAvailabilityController>;
export const deleteAvailabilityController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        deleteAvailabilityUseCase: IDeleteAvailabilityUseCase,
    ) =>
    async (input: unknown): Promise<void> =>
        instrumentationService.startSpan({ name: 'deleteAvailability Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            await deleteAvailabilityUseCase(data.id);
        });
