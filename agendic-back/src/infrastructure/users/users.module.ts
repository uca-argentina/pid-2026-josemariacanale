import { Module } from '@nestjs/common';
import { DeleteFutureBookingEventsService } from '../../application/calendar/delete-future-booking-events.service';
import { DisconnectCalendarUseCase } from '../../application/calendar/disconnect-calendar.use-case';
import { GetMeUseCase } from '../../application/users/get-me.use-case';
import { ResolveCurrentUserUseCase } from '../../application/users/resolve-current-user.use-case';
import { RetireMeUseCase } from '../../application/users/retire-me.use-case';
import { UpdateMeUseCase } from '../../application/users/update-me.use-case';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    GetMeUseCase,
    UpdateMeUseCase,
    RetireMeUseCase,
    DisconnectCalendarUseCase,
    DeleteFutureBookingEventsService,
    ResolveCurrentUserUseCase,
  ],
  exports: [ResolveCurrentUserUseCase],
})
export class UsersModule {}
