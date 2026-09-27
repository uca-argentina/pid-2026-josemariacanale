import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Booking, BookingStatus } from '@/src/entities/models/booking';

export type IUpdateBookingStatusUseCase = ReturnType<typeof updateBookingStatusUseCase>;
export const updateBookingStatusUseCase =
    (instrumentationService: IInstrumentationService, bookingsRepository: IBookingsRepository) =>
    (bookingId: number, status: BookingStatus): Promise<Booking> =>
        instrumentationService.startSpan({ name: 'updateBookingStatus Use Case', op: 'function' }, () =>
            bookingsRepository.updateStatus(bookingId, status),
        );
