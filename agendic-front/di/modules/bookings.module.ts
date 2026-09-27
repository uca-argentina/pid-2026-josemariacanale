import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { BookingsRepository } from '@/src/infrastructure/repositories/bookings.repository';
import { createBookingUseCase } from '@/src/application/use-cases/bookings/create-booking.use-case';
import { getServiceSlotsUseCase } from '@/src/application/use-cases/bookings/get-service-slots.use-case';
import { payDepositUseCase } from '@/src/application/use-cases/bookings/pay-deposit.use-case';
import { updateBookingStatusUseCase } from '@/src/application/use-cases/bookings/update-booking-status.use-case';
import { createBookingController } from '@/src/interface-adapters/controllers/bookings/create-booking.controller';
import { getServiceSlotsController } from '@/src/interface-adapters/controllers/bookings/get-service-slots.controller';
import { payDepositController } from '@/src/interface-adapters/controllers/bookings/pay-deposit.controller';
import { updateBookingStatusController } from '@/src/interface-adapters/controllers/bookings/update-booking-status.controller';

export function createBookingsModule() {
    const bookingsModule = createModule();

    bookingsModule
        .bind(DI_SYMBOLS.IBookingsRepository)
        .toClass(BookingsRepository, [DI_SYMBOLS.IAuthenticationService]);

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
        .bind(DI_SYMBOLS.IPayDepositUseCase)
        .toHigherOrderFunction(payDepositUseCase, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IBookingsRepository,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.IUpdateBookingStatusUseCase)
        .toHigherOrderFunction(updateBookingStatusUseCase, [
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

    bookingsModule
        .bind(DI_SYMBOLS.IPayDepositController)
        .toHigherOrderFunction(payDepositController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IPayDepositUseCase,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.IUpdateBookingStatusController)
        .toHigherOrderFunction(updateBookingStatusController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IUpdateBookingStatusUseCase,
        ]);

    return bookingsModule;
}
