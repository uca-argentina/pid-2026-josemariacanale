import { Module } from '@nestjs/common';
import { CompleteGoogleCalendarConnectionUseCase } from '../../application/calendar/complete-google-calendar-connection.use-case';
import { DisconnectCalendarUseCase } from '../../application/calendar/disconnect-calendar.use-case';
import { GetCalendarConnectionUseCase } from '../../application/calendar/get-calendar-connection.use-case';
import { StartGoogleCalendarConnectionUseCase } from '../../application/calendar/start-google-calendar-connection.use-case';
import { UsersModule } from '../users/users.module';
import { CalendarOauthController } from './calendar-oauth.controller';
import { CalendarController } from './calendar.controller';

/** El Calendario conectado del Usuario (ADR 0036). */
@Module({
  imports: [UsersModule],
  controllers: [CalendarController, CalendarOauthController],
  providers: [
    GetCalendarConnectionUseCase,
    StartGoogleCalendarConnectionUseCase,
    CompleteGoogleCalendarConnectionUseCase,
    DisconnectCalendarUseCase,
  ],
})
export class CalendarModule {}
