import { Module } from '@nestjs/common';
import { CancelBookingUseCase } from '../../application/bookings/cancel-booking.use-case';
import { CancelBookingByLinkUseCase } from '../../application/bookings/cancel-booking-by-link.use-case';
import { GetBookingByLinkUseCase } from '../../application/bookings/get-booking-by-link.use-case';
import { MarkNoShowUseCase } from '../../application/bookings/mark-no-show.use-case';
import { GetBookingHistoryUseCase } from '../../application/bookings/get-booking-history.use-case';
import { UnmarkNoShowUseCase } from '../../application/bookings/unmark-no-show.use-case';
import { RescheduleBookingUseCase } from '../../application/bookings/reschedule-booking.use-case';
import { RescheduleBookingByLinkUseCase } from '../../application/bookings/reschedule-booking-by-link.use-case';
import { MarkEmployeeNoShowByLinkUseCase } from '../../application/bookings/mark-employee-no-show-by-link.use-case';
import { RateBookingByLinkUseCase } from '../../application/bookings/rate-booking-by-link.use-case';
import { PayDepositByLinkUseCase } from '../../application/bookings/pay-deposit-by-link.use-case';
import { ListSlotsUseCase } from '../../application/slots/list-slots.use-case';
import { CreateBookingSeriesUseCase } from '../../application/bookings/create-booking-series.use-case';
import { ListSeriesSlotsUseCase } from '../../application/slots/list-series-slots.use-case';
import { CreateBookingUseCase } from '../../application/bookings/create-booking.use-case';
import { ListMyBookingsUseCase } from '../../application/bookings/list-my-bookings.use-case';
import { ListBookingsByBusinessUseCase } from '../../application/bookings/list-bookings-by-business.use-case';
import { AcceptBookingUseCase } from '../../application/bookings/accept-booking.use-case';
import { RejectBookingUseCase } from '../../application/bookings/reject-booking.use-case';
import { RequestBookingCodeUseCase } from '../../application/bookings/request-booking-code.use-case';
import { HolidaysModule } from '../holidays/holidays.module';
import { UsersModule } from '../users/users.module';
import { SendRatingRequestsUseCase } from '../../application/bookings/send-rating-requests.use-case';
import { RatingRequestsJob } from './rating-requests.job';
import { BookingLinksController } from './booking-links.controller';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [UsersModule, HolidaysModule],
  controllers: [BookingsController, BookingLinksController],
  providers: [
    CreateBookingUseCase,
    CreateBookingSeriesUseCase,
    ListSeriesSlotsUseCase,
    RequestBookingCodeUseCase,
    AcceptBookingUseCase,
    RejectBookingUseCase,
    ListBookingsByBusinessUseCase,
    CancelBookingUseCase,
    RescheduleBookingUseCase,
    MarkNoShowUseCase,
    UnmarkNoShowUseCase,
    GetBookingHistoryUseCase,
    ListSlotsUseCase,
    GetBookingByLinkUseCase,
    CancelBookingByLinkUseCase,
    RescheduleBookingByLinkUseCase,
    PayDepositByLinkUseCase,
    MarkEmployeeNoShowByLinkUseCase,
    RateBookingByLinkUseCase,
    ListMyBookingsUseCase,
    SendRatingRequestsUseCase,
    RatingRequestsJob,
  ],
})
export class BookingsModule {}
