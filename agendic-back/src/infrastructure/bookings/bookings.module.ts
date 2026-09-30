import { Module } from '@nestjs/common';
import { CancelBookingUseCase } from '../../application/bookings/cancel-booking.use-case';
import { MarkNoShowUseCase } from '../../application/bookings/mark-no-show.use-case';
import { RescheduleBookingUseCase } from '../../application/bookings/reschedule-booking.use-case';
import { ListSlotsUseCase } from '../../application/slots/list-slots.use-case';
import { CreateBookingUseCase } from '../../application/bookings/create-booking.use-case';
import { ListBookingsByBusinessUseCase } from '../../application/bookings/list-bookings-by-business.use-case';
import { AcceptBookingUseCase } from '../../application/bookings/accept-booking.use-case';
import { RejectBookingUseCase } from '../../application/bookings/reject-booking.use-case';
import { VerifyBookingUseCase } from '../../application/bookings/verify-booking.use-case';
import { UsersModule } from '../users/users.module';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [UsersModule],
  controllers: [BookingsController],
  providers: [
    CreateBookingUseCase,
    VerifyBookingUseCase,
    AcceptBookingUseCase,
    RejectBookingUseCase,
    ListBookingsByBusinessUseCase,
    CancelBookingUseCase,
    RescheduleBookingUseCase,
    MarkNoShowUseCase,
    ListSlotsUseCase,
  ],
})
export class BookingsModule {}
