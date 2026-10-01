import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { bookSlotUseCase } from '@/src/application/use-cases/bookings/book-slot.use-case';
import { listSlotsUseCase } from '@/src/application/use-cases/bookings/list-slots.use-case';
import { listMyBookingsUseCase } from '@/src/application/use-cases/bookings/list-my-bookings.use-case';
import { EmployeeBookingsRepository } from '@/src/infrastructure/repositories/employee-bookings.repository';
import { listMyBookingsController } from '@/src/interface-adapters/controllers/bookings/list-my-bookings.controller';
import { markBookingNoShowUseCase } from '@/src/application/use-cases/bookings/mark-booking-no-show.use-case';
import { markBookingNoShowController } from '@/src/interface-adapters/controllers/bookings/mark-booking-no-show.controller';
import { rescheduleBookingUseCase } from '@/src/application/use-cases/bookings/reschedule-booking.use-case';
import { rescheduleBookingController } from '@/src/interface-adapters/controllers/bookings/reschedule-booking.controller';
import { cancelBookingUseCase } from '@/src/application/use-cases/bookings/cancel-booking.use-case';
import { cancelBookingController } from '@/src/interface-adapters/controllers/bookings/cancel-booking.controller';
import { rejectBookingUseCase } from '@/src/application/use-cases/bookings/reject-booking.use-case';
import { rejectBookingController } from '@/src/interface-adapters/controllers/bookings/reject-booking.controller';
import { acceptBookingUseCase } from '@/src/application/use-cases/bookings/accept-booking.use-case';
import { acceptBookingController } from '@/src/interface-adapters/controllers/bookings/accept-booking.controller';
import { BookingsRepository } from '@/src/infrastructure/repositories/bookings.repository';
import { bookSlotController } from '@/src/interface-adapters/controllers/bookings/book-slot.controller';
import { verifyBookingUseCase } from '@/src/application/use-cases/bookings/verify-booking.use-case';
import { verifyBookingController } from '@/src/interface-adapters/controllers/bookings/verify-booking.controller';
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

    bookingsModule
        .bind(DI_SYMBOLS.IVerifyBookingUseCase)
        .toHigherOrderFunction(verifyBookingUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IVerifyBookingController)
        .toHigherOrderFunction(verifyBookingController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IVerifyBookingUseCase]);

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

    bookingsModule
        .bind(DI_SYMBOLS.IAcceptBookingUseCase)
        .toHigherOrderFunction(acceptBookingUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IEmployeeBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IAcceptBookingController)
        .toHigherOrderFunction(acceptBookingController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IAcceptBookingUseCase,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.IRejectBookingUseCase)
        .toHigherOrderFunction(rejectBookingUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IEmployeeBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IRejectBookingController)
        .toHigherOrderFunction(rejectBookingController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IRejectBookingUseCase,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.ICancelBookingUseCase)
        .toHigherOrderFunction(cancelBookingUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IEmployeeBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.ICancelBookingController)
        .toHigherOrderFunction(cancelBookingController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.ICancelBookingUseCase,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.IRescheduleBookingUseCase)
        .toHigherOrderFunction(rescheduleBookingUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IEmployeeBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IRescheduleBookingController)
        .toHigherOrderFunction(rescheduleBookingController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IRescheduleBookingUseCase,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.IMarkBookingNoShowUseCase)
        .toHigherOrderFunction(markBookingNoShowUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IEmployeeBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IMarkBookingNoShowController)
        .toHigherOrderFunction(markBookingNoShowController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IMarkBookingNoShowUseCase,
        ]);

    return bookingsModule;
}
