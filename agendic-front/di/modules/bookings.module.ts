import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { bookSlotUseCase } from '@/src/application/use-cases/bookings/book-slot.use-case';
import { listSlotsUseCase } from '@/src/application/use-cases/bookings/list-slots.use-case';
import { listMyBookingsUseCase } from '@/src/application/use-cases/bookings/list-my-bookings.use-case';
import { UserBookingsRepository } from '@/src/infrastructure/repositories/user-bookings.repository';
import { listMyBookingsController } from '@/src/interface-adapters/controllers/bookings/list-my-bookings.controller';
import { markBookingNoShowUseCase } from '@/src/application/use-cases/bookings/mark-booking-no-show.use-case';
import { markBookingNoShowController } from '@/src/interface-adapters/controllers/bookings/mark-booking-no-show.controller';
import { getBookingHistoryUseCase } from '@/src/application/use-cases/bookings/get-booking-history.use-case';
import { getBookingHistoryController } from '@/src/interface-adapters/controllers/bookings/get-booking-history.controller';
import { unmarkBookingNoShowUseCase } from '@/src/application/use-cases/bookings/unmark-booking-no-show.use-case';
import { unmarkBookingNoShowController } from '@/src/interface-adapters/controllers/bookings/unmark-booking-no-show.controller';

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
import { listSeriesSlotsUseCase } from '@/src/application/use-cases/bookings/list-series-slots.use-case';
import { listSeriesSlotsController } from '@/src/interface-adapters/controllers/bookings/list-series-slots.controller';
import { ClientBookingsRepository } from '@/src/infrastructure/repositories/client-bookings.repository';
import { getBookingByLinkUseCase } from '@/src/application/use-cases/bookings/get-booking-by-link.use-case';
import { getBookingByLinkController } from '@/src/interface-adapters/controllers/bookings/get-booking-by-link.controller';
import { cancelBookingByLinkUseCase } from '@/src/application/use-cases/bookings/cancel-booking-by-link.use-case';
import { cancelBookingByLinkController } from '@/src/interface-adapters/controllers/bookings/cancel-booking-by-link.controller';
import { cancelBookingSeriesByLinkUseCase } from '@/src/application/use-cases/bookings/cancel-booking-series-by-link.use-case';
import { cancelBookingSeriesByLinkController } from '@/src/interface-adapters/controllers/bookings/cancel-booking-series-by-link.controller';
import { rateBookingByLinkUseCase } from '@/src/application/use-cases/bookings/rate-booking-by-link.use-case';
import { rateBookingByLinkController } from '@/src/interface-adapters/controllers/bookings/rate-booking-by-link.controller';
import { markEmployeeNoShowByLinkUseCase } from '@/src/application/use-cases/bookings/mark-employee-no-show-by-link.use-case';
import { markEmployeeNoShowByLinkController } from '@/src/interface-adapters/controllers/bookings/mark-employee-no-show-by-link.controller';
import { payDepositByLinkUseCase } from '@/src/application/use-cases/bookings/pay-deposit-by-link.use-case';
import { payDepositByLinkController } from '@/src/interface-adapters/controllers/bookings/pay-deposit-by-link.controller';
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
        .bind(DI_SYMBOLS.IListSeriesSlotsUseCase)
        .toHigherOrderFunction(listSeriesSlotsUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IListSeriesSlotsController)
        .toHigherOrderFunction(listSeriesSlotsController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IListSeriesSlotsUseCase]);

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

    bookingsModule.bind(DI_SYMBOLS.IUserBookingsRepository).toClass(UserBookingsRepository, [DI_SYMBOLS.IAuthenticationService]);

    bookingsModule
        .bind(DI_SYMBOLS.IListMyBookingsUseCase)
        .toHigherOrderFunction(listMyBookingsUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IUserBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IListMyBookingsController)
        .toHigherOrderFunction(listMyBookingsController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IListMyBookingsUseCase,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.IAcceptBookingUseCase)
        .toHigherOrderFunction(acceptBookingUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IUserBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IAcceptBookingController)
        .toHigherOrderFunction(acceptBookingController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IAcceptBookingUseCase,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.IRejectBookingUseCase)
        .toHigherOrderFunction(rejectBookingUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IUserBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IRejectBookingController)
        .toHigherOrderFunction(rejectBookingController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IRejectBookingUseCase,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.ICancelBookingUseCase)
        .toHigherOrderFunction(cancelBookingUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IUserBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.ICancelBookingController)
        .toHigherOrderFunction(cancelBookingController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.ICancelBookingUseCase,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.IRescheduleBookingUseCase)
        .toHigherOrderFunction(rescheduleBookingUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IUserBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IRescheduleBookingController)
        .toHigherOrderFunction(rescheduleBookingController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IRescheduleBookingUseCase,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.IMarkBookingNoShowUseCase)
        .toHigherOrderFunction(markBookingNoShowUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IUserBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IMarkBookingNoShowController)
        .toHigherOrderFunction(markBookingNoShowController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IMarkBookingNoShowUseCase,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.IUnmarkBookingNoShowUseCase)
        .toHigherOrderFunction(unmarkBookingNoShowUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IUserBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IUnmarkBookingNoShowController)
        .toHigherOrderFunction(unmarkBookingNoShowController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IUnmarkBookingNoShowUseCase,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.IGetBookingHistoryUseCase)
        .toHigherOrderFunction(getBookingHistoryUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IUserBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IGetBookingHistoryController)
        .toHigherOrderFunction(getBookingHistoryController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IGetBookingHistoryUseCase,

        ]);

    bookingsModule.bind(DI_SYMBOLS.IClientBookingsRepository).toClass(ClientBookingsRepository, [DI_SYMBOLS.IInstrumentationService]);

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
        .bind(DI_SYMBOLS.ICancelBookingSeriesByLinkUseCase)
        .toHigherOrderFunction(cancelBookingSeriesByLinkUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IClientBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.ICancelBookingSeriesByLinkController)
        .toHigherOrderFunction(cancelBookingSeriesByLinkController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICancelBookingSeriesByLinkUseCase]);

    bookingsModule
        .bind(DI_SYMBOLS.IPayDepositByLinkUseCase)
        .toHigherOrderFunction(payDepositByLinkUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IClientBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IPayDepositByLinkController)
        .toHigherOrderFunction(payDepositByLinkController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IPayDepositByLinkUseCase]);

    bookingsModule
        .bind(DI_SYMBOLS.IMarkEmployeeNoShowByLinkUseCase)
        .toHigherOrderFunction(markEmployeeNoShowByLinkUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IClientBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IMarkEmployeeNoShowByLinkController)
        .toHigherOrderFunction(markEmployeeNoShowByLinkController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IMarkEmployeeNoShowByLinkUseCase,
        ]);

    bookingsModule
        .bind(DI_SYMBOLS.IRateBookingByLinkUseCase)
        .toHigherOrderFunction(rateBookingByLinkUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IClientBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IRateBookingByLinkController)
        .toHigherOrderFunction(rateBookingByLinkController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IRateBookingByLinkUseCase]);

    bookingsModule
        .bind(DI_SYMBOLS.IRescheduleBookingByLinkUseCase)
        .toHigherOrderFunction(rescheduleBookingByLinkUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IClientBookingsRepository]);

    bookingsModule
        .bind(DI_SYMBOLS.IRescheduleBookingByLinkController)
        .toHigherOrderFunction(rescheduleBookingByLinkController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IRescheduleBookingByLinkUseCase]);

    return bookingsModule;
}
