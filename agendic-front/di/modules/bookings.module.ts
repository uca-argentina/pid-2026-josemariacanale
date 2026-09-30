import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { bookSlotUseCase } from '@/src/application/use-cases/bookings/book-slot.use-case';
import { listSlotsUseCase } from '@/src/application/use-cases/bookings/list-slots.use-case';
import { listMyBookingsUseCase } from '@/src/application/use-cases/bookings/list-my-bookings.use-case';
import { EmployeeBookingsRepository } from '@/src/infrastructure/repositories/employee-bookings.repository';
import { listMyBookingsController } from '@/src/interface-adapters/controllers/bookings/list-my-bookings.controller';
import { BookingsRepository } from '@/src/infrastructure/repositories/bookings.repository';
import { bookSlotController } from '@/src/interface-adapters/controllers/bookings/book-slot.controller';
import { listSlotsController } from '@/src/interface-adapters/controllers/bookings/list-slots.controller';

export function createBookingsModule() {
    const bookingsModule = createModule();

    // Reservar is public, so its repository takes no IAuthenticationService.
    bookingsModule.bind(DI_SYMBOLS.IBookingsRepository).toClass(BookingsRepository);

    bookingsModule
        .bind(DI_SYMBOLS.IListSlotsUseCase)
        .toHigherOrderFunction(listSlotsUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IListSlotsController)
        .toHigherOrderFunction(listSlotsController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IListSlotsUseCase]);

    bookingsModule
        .bind(DI_SYMBOLS.IBookSlotUseCase)
        .toHigherOrderFunction(bookSlotUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IBookSlotController)
        .toHigherOrderFunction(bookSlotController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBookSlotUseCase]);

    bookingsModule.bind(DI_SYMBOLS.IEmployeeBookingsRepository).toClass(EmployeeBookingsRepository, [DI_SYMBOLS.IAuthenticationService]);

    bookingsModule
        .bind(DI_SYMBOLS.IListMyBookingsUseCase)
        .toHigherOrderFunction(listMyBookingsUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IEmployeeBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IListMyBookingsController)
        .toHigherOrderFunction(listMyBookingsController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IListMyBookingsUseCase,
        ]);

    return bookingsModule;
}
