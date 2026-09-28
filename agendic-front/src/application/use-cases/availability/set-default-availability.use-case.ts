import { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { IAvailabilityService } from '@/src/application/services/availability.service.interface';
import { Availability } from '@/src/entities/models/availability';

export type ISetDefaultAvailabilityUseCase = ReturnType<typeof setDefaultAvailabilityUseCase>;

export const setDefaultAvailabilityUseCase =
    (instrumentationService: IInstrumentationService, availabilityService: IAvailabilityService) =>
    async (id: string): Promise<Availability> =>
        instrumentationService.startSpan({ name: 'setDefaultAvailability Use Case', op: 'function' }, async () => {
            return await availabilityService.setDefaultAvailability(id);
        });
