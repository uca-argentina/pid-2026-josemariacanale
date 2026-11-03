import { Module } from '@nestjs/common';
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
    ResolveCurrentUserUseCase,
  ],
  exports: [ResolveCurrentUserUseCase],
})
export class UsersModule {}
