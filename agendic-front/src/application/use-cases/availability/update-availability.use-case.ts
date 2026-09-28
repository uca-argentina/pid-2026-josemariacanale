import { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { IAvailabilityService } from '@/src/application/services/availability.service.interface';
import { Availability } from '@/src/entities/models/availability';
import { ValidationError } from '@/src/entities/errors/common';
import { intervalsValid } from '@/src/entities/models/availability';

export type IUpdateAvailabilityUseCase = ReturnType<typeof updateAvailabilityUseCase>;

export const updateAvailabilityUseCase =
    (instrumentationService: IInstrumentationService, availabilityService: IAvailabilityService) =>
    async (id: string, data: Omit<Availability, 'id' | 'isDefault'>): Promise<Availability> =>
        instrumentationService.startSpan({ name: 'updateAvailability Use Case', op: 'function' }, async () => {
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
            return await availabilityService.updateAvailability(id, data);
        });
