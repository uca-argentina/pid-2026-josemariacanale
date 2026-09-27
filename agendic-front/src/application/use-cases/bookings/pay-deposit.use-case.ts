import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Booking } from '@/src/entities/models/booking';

export type IPayDepositUseCase = ReturnType<typeof payDepositUseCase>;
export const payDepositUseCase =
    (instrumentationService: IInstrumentationService, bookingsRepository: IBookingsRepository) =>
    (bookingId: number): Promise<Booking> =>
        instrumentationService.startSpan({ name: 'payDeposit Use Case', op: 'function' }, () =>
            bookingsRepository.payDeposit(bookingId),
        );
