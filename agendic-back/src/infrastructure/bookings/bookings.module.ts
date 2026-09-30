import { Module } from '@nestjs/common';
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
  ],
})
export class BookingsModule {}
