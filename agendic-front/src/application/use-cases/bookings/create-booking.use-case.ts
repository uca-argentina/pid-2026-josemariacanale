import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Booking, CreateBooking } from '@/src/entities/models/booking';

export type ICreateBookingUseCase = ReturnType<typeof createBookingUseCase>;
export const createBookingUseCase =
    (instrumentationService: IInstrumentationService, bookingsRepository: IBookingsRepository) =>
    (input: CreateBooking): Promise<Booking> =>
        instrumentationService.startSpan({ name: 'createBooking Use Case', op: 'function' }, () =>
            bookingsRepository.createBooking(input),
        );
