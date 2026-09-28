import { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { IAvailabilityService } from '@/src/application/services/availability.service.interface';
import { Availability } from '@/src/entities/models/availability';
import { ValidationError } from '@/src/entities/errors/common';
import { intervalsValid } from '@/src/entities/models/availability';

export type ICreateAvailabilityUseCase = ReturnType<typeof createAvailabilityUseCase>;

export const createAvailabilityUseCase =
    (instrumentationService: IInstrumentationService, availabilityService: IAvailabilityService) =>
    async (employeeId: number, data: Omit<Availability, 'id' | 'isDefault'>): Promise<Availability> =>
        instrumentationService.startSpan({ name: 'createAvailability Use Case', op: 'function' }, async () => {
            for (const day of data.days) {
                if (!intervalsValid(day)) {
                    throw new ValidationError('Invalid availability intervals');
                }
            }
            for (const override of data.overrides) {
                if (!intervalsValid(override.intervals)) {
                    throw new ValidationError('Invalid availability override intervals');
                }
            }
            return await availabilityService.createAvailability(employeeId, data);
        });
