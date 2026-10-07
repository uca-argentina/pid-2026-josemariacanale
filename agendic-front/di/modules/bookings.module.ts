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
import { requestVerificationCodeUseCase } from '@/src/application/use-cases/bookings/request-verification-code.use-case';
import { requestVerificationCodeController } from '@/src/interface-adapters/controllers/bookings/request-verification-code.controller';
import { listSlotsController } from '@/src/interface-adapters/controllers/bookings/list-slots.controller';
import { ClientBookingsRepository } from '@/src/infrastructure/repositories/client-bookings.repository';
import { openClientAccessUseCase } from '@/src/application/use-cases/bookings/open-client-access.use-case';
import { openClientAccessController } from '@/src/interface-adapters/controllers/bookings/open-client-access.controller';
import { listClientBookingsUseCase } from '@/src/application/use-cases/bookings/list-client-bookings.use-case';
import { listClientBookingsController } from '@/src/interface-adapters/controllers/bookings/list-client-bookings.controller';
import { cancelClientBookingUseCase } from '@/src/application/use-cases/bookings/cancel-client-booking.use-case';
import { cancelClientBookingController } from '@/src/interface-adapters/controllers/bookings/cancel-client-booking.controller';
import { rescheduleClientBookingUseCase } from '@/src/application/use-cases/bookings/reschedule-client-booking.use-case';
import { rescheduleClientBookingController } from '@/src/interface-adapters/controllers/bookings/reschedule-client-booking.controller';
import { getBookingByLinkUseCase } from '@/src/application/use-cases/bookings/get-booking-by-link.use-case';
import { getBookingByLinkController } from '@/src/interface-adapters/controllers/bookings/get-booking-by-link.controller';
import { cancelBookingByLinkUseCase } from '@/src/application/use-cases/bookings/cancel-booking-by-link.use-case';
import { cancelBookingByLinkController } from '@/src/interface-adapters/controllers/bookings/cancel-booking-by-link.controller';
import { rescheduleBookingByLinkUseCase } from '@/src/application/use-cases/bookings/reschedule-booking-by-link.use-case';
import { rescheduleBookingByLinkController } from '@/src/interface-adapters/controllers/bookings/reschedule-booking-by-link.controller';

/**
 * Cablea Turnos. Reservar es público, así que `BookingsRepository` no recibe `IAuthenticationService`.
 */
export function createBookingsModule() {
    const bookingsModule = createModule();

    bookingsModule.bind(DI_SYMBOLS.IBookingsRepository).toClass(BookingsRepository, [DI_SYMBOLS.IInstrumentationService]);

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
        .bind(DI_SYMBOLS.IRequestVerificationCodeUseCase)
        .toHigherOrderFunction(requestVerificationCodeUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IRequestVerificationCodeController)
        .toHigherOrderFunction(requestVerificationCodeController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IRequestVerificationCodeUseCase,
        ]);

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

    bookingsModule.bind(DI_SYMBOLS.IClientBookingsRepository).toClass(ClientBookingsRepository, [DI_SYMBOLS.IInstrumentationService]);

    bookingsModule
        .bind(DI_SYMBOLS.IOpenClientAccessUseCase)
        .toHigherOrderFunction(openClientAccessUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IClientBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IOpenClientAccessController)
        .toHigherOrderFunction(openClientAccessController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IOpenClientAccessUseCase]);

    bookingsModule
        .bind(DI_SYMBOLS.IListClientBookingsUseCase)
        .toHigherOrderFunction(listClientBookingsUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IClientBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IListClientBookingsController)
        .toHigherOrderFunction(listClientBookingsController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IListClientBookingsUseCase]);

    bookingsModule
        .bind(DI_SYMBOLS.ICancelClientBookingUseCase)
        .toHigherOrderFunction(cancelClientBookingUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IClientBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.ICancelClientBookingController)
        .toHigherOrderFunction(cancelClientBookingController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICancelClientBookingUseCase]);

    bookingsModule
        .bind(DI_SYMBOLS.IRescheduleClientBookingUseCase)
        .toHigherOrderFunction(rescheduleClientBookingUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IClientBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IRescheduleClientBookingController)
        .toHigherOrderFunction(rescheduleClientBookingController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IRescheduleClientBookingUseCase,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.IGetBookingByLinkUseCase)
        .toHigherOrderFunction(getBookingByLinkUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IClientBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IGetBookingByLinkController)
        .toHigherOrderFunction(getBookingByLinkController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IGetBookingByLinkUseCase]);

    bookingsModule
        .bind(DI_SYMBOLS.ICancelBookingByLinkUseCase)
        .toHigherOrderFunction(cancelBookingByLinkUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IClientBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.ICancelBookingByLinkController)
        .toHigherOrderFunction(cancelBookingByLinkController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICancelBookingByLinkUseCase]);

    bookingsModule
        .bind(DI_SYMBOLS.IRescheduleBookingByLinkUseCase)
        .toHigherOrderFunction(rescheduleBookingByLinkUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IClientBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IRescheduleBookingByLinkController)
        .toHigherOrderFunction(rescheduleBookingByLinkController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IRescheduleBookingByLinkUseCase]);

    return bookingsModule;
}
