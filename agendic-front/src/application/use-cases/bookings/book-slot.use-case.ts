import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Booking, CreateBooking } from '@/src/entities/models/booking';

export type IBookSlotUseCase = ReturnType<typeof bookSlotUseCase>;
// Reservar: the Cliente takes a Horario reservable. The state the Turno is born in is the back's call.
export const bookSlotUseCase =
    (instrumentationService: IInstrumentationService, bookingsRepository: IBookingsRepository) =>
    ({ notes, ...input }: CreateBooking): Promise<Booking> =>
        instrumentationService.startSpan({ name: 'bookSlot Use Case', op: 'function' }, () =>
            // A Comentario del Turno is only sent when the Cliente wrote one.
            bookingsRepository.book(notes ? { ...input, notes } : input),
        );
