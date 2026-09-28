import { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { IAvailabilityService } from '@/src/application/services/availability.service.interface';

export type IDeleteAvailabilityUseCase = ReturnType<typeof deleteAvailabilityUseCase>;

export const deleteAvailabilityUseCase =
    (instrumentationService: IInstrumentationService, availabilityService: IAvailabilityService) =>
    async (id: string): Promise<void> =>
        instrumentationService.startSpan({ name: 'deleteAvailability Use Case', op: 'function' }, async () => {
            return await availabilityService.deleteAvailability(id);
        });
