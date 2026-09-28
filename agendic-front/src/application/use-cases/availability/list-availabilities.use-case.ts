import { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { IAvailabilityService } from '@/src/application/services/availability.service.interface';
import { Availability } from '@/src/entities/models/availability';

export type IListAvailabilitiesUseCase = ReturnType<typeof listAvailabilitiesUseCase>;

export const listAvailabilitiesUseCase =
    (instrumentationService: IInstrumentationService, availabilityService: IAvailabilityService) =>
    async (employeeId: number): Promise<Availability[]> =>
        instrumentationService.startSpan({ name: 'listAvailabilities Use Case', op: 'function' }, async () => {
            return await availabilityService.getAvailabilities(employeeId);
        });
