import { Module } from '@nestjs/common';
import { CancelBookingUseCase } from '../../application/bookings/cancel-booking.use-case';
import { CancelBookingByLinkUseCase } from '../../application/bookings/cancel-booking-by-link.use-case';
import { GetBookingByLinkUseCase } from '../../application/bookings/get-booking-by-link.use-case';
import { MarkNoShowUseCase } from '../../application/bookings/mark-no-show.use-case';
import { RescheduleBookingUseCase } from '../../application/bookings/reschedule-booking.use-case';
import { RescheduleBookingByLinkUseCase } from '../../application/bookings/reschedule-booking-by-link.use-case';
import { ListSlotsUseCase } from '../../application/slots/list-slots.use-case';
import { CreateBookingUseCase } from '../../application/bookings/create-booking.use-case';
import { ListBookingsByBusinessUseCase } from '../../application/bookings/list-bookings-by-business.use-case';
import { AcceptBookingUseCase } from '../../application/bookings/accept-booking.use-case';
import { RejectBookingUseCase } from '../../application/bookings/reject-booking.use-case';
import { RequestBookingCodeUseCase } from '../../application/bookings/request-booking-code.use-case';
import { UsersModule } from '../users/users.module';
import { BookingLinksController } from './booking-links.controller';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [UsersModule],
  controllers: [BookingsController, BookingLinksController],
  providers: [
    CreateBookingUseCase,
    RequestBookingCodeUseCase,
    AcceptBookingUseCase,
    RejectBookingUseCase,
    ListBookingsByBusinessUseCase,
    CancelBookingUseCase,
    RescheduleBookingUseCase,
    MarkNoShowUseCase,
    ListSlotsUseCase,
    GetBookingByLinkUseCase,
    CancelBookingByLinkUseCase,
    RescheduleBookingByLinkUseCase,
  ],
})
export class BookingsModule {}
