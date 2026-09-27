import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ServiceSlots } from '@/src/entities/models/slot';

export interface GetServiceSlotsInput {
    serviceId: number;
    employeeId: number;
    from: string;
    to: string;
}

export type IGetServiceSlotsUseCase = ReturnType<typeof getServiceSlotsUseCase>;
export const getServiceSlotsUseCase =
    (instrumentationService: IInstrumentationService, bookingsRepository: IBookingsRepository) =>
    (input: GetServiceSlotsInput): Promise<ServiceSlots> =>
        instrumentationService.startSpan({ name: 'getServiceSlots Use Case', op: 'function' }, () =>
            bookingsRepository.getServiceSlots(input.serviceId, input.employeeId, input.from, input.to),
        );
