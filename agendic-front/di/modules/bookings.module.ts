import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { BookingsRepository } from '@/src/infrastructure/repositories/bookings.repository';
import { createBookingUseCase } from '@/src/application/use-cases/bookings/create-booking.use-case';
import { getServiceSlotsUseCase } from '@/src/application/use-cases/bookings/get-service-slots.use-case';
import { createBookingController } from '@/src/interface-adapters/controllers/bookings/create-booking.controller';
import { getServiceSlotsController } from '@/src/interface-adapters/controllers/bookings/get-service-slots.controller';

export function createBookingsModule() {
    const bookingsModule = createModule();

    bookingsModule.bind(DI_SYMBOLS.IBookingsRepository).toClass(BookingsRepository);

    bookingsModule
        .bind(DI_SYMBOLS.ICreateBookingUseCase)
        .toHigherOrderFunction(createBookingUseCase, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IBookingsRepository,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.IGetServiceSlotsUseCase)
        .toHigherOrderFunction(getServiceSlotsUseCase, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IBookingsRepository,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.ICreateBookingController)
        .toHigherOrderFunction(createBookingController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.ICreateBookingUseCase,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.IGetServiceSlotsController)
        .toHigherOrderFunction(getServiceSlotsController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IGetServiceSlotsUseCase,
        ]);

    return bookingsModule;
}
