import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ISlotsRepository } from '@/src/application/repositories/slots.repository.interface';
import type { ServiceSlots } from '@/src/entities/models/slot';

export type IGetSlotsUseCase = ReturnType<typeof getSlotsUseCase>;

export const getSlotsUseCase =
    (instrumentationService: IInstrumentationService, slotsRepository: ISlotsRepository) =>
    async (input: { serviceId: number; employeeId: number; from: string; to: string }): Promise<ServiceSlots> =>
        instrumentationService.startSpan({ name: 'getSlots Use Case', op: 'function' }, async () => {
            return await slotsRepository.getSlots(input.serviceId, input.employeeId, input.from, input.to);
        });
