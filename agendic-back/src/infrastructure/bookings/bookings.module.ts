import { Module } from '@nestjs/common';
import { CancelBookingUseCase } from '../../application/bookings/cancel-booking.use-case';
import { CancelClientBookingUseCase } from '../../application/bookings/cancel-client-booking.use-case';
import { ListClientBookingsUseCase } from '../../application/bookings/list-client-bookings.use-case';
import { MarkNoShowUseCase } from '../../application/bookings/mark-no-show.use-case';
import { RequestClientAccessUseCase } from '../../application/bookings/request-client-access.use-case';
import { RescheduleBookingUseCase } from '../../application/bookings/reschedule-booking.use-case';
import { RescheduleClientBookingUseCase } from '../../application/bookings/reschedule-client-booking.use-case';
import { ListSlotsUseCase } from '../../application/slots/list-slots.use-case';
import { CreateBookingUseCase } from '../../application/bookings/create-booking.use-case';
import { ListBookingsByBusinessUseCase } from '../../application/bookings/list-bookings-by-business.use-case';
import { AcceptBookingUseCase } from '../../application/bookings/accept-booking.use-case';
import { RejectBookingUseCase } from '../../application/bookings/reject-booking.use-case';
import { RequestBookingCodeUseCase } from '../../application/bookings/request-booking-code.use-case';
import { UsersModule } from '../users/users.module';
import { BookingsController } from './bookings.controller';
import { ClientAccessGuard } from './client-access.guard';
import { ClientBookingsController } from './client-bookings.controller';

@Module({
  imports: [UsersModule],
  controllers: [BookingsController, ClientBookingsController],
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
    RequestClientAccessUseCase,
    ListClientBookingsUseCase,
    CancelClientBookingUseCase,
    RescheduleClientBookingUseCase,
    ClientAccessGuard,
  ],
})
export class BookingsModule {}
