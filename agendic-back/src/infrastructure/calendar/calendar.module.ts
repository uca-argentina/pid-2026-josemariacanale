import { Module } from '@nestjs/common';
import { CompleteGoogleCalendarConnectionUseCase } from '../../application/calendar/complete-google-calendar-connection.use-case';
import { DeleteFutureBookingEventsService } from '../../application/calendar/delete-future-booking-events.service';
import { ReconcileBookingCalendarEventsUseCase } from '../../application/calendar/reconcile-booking-calendar-events.use-case';
import { DisconnectCalendarUseCase } from '../../application/calendar/disconnect-calendar.use-case';
import { GetCalendarConnectionUseCase } from '../../application/calendar/get-calendar-connection.use-case';
import { StartGoogleCalendarConnectionUseCase } from '../../application/calendar/start-google-calendar-connection.use-case';
import { ConnectedCalendarsService } from '../../application/calendar/connected-calendars.service';
import { ListCalendarsUseCase } from '../../application/calendar/list-calendars.use-case';
import { SetCheckedCalendarsUseCase } from '../../application/calendar/set-checked-calendars.use-case';
import { UsersModule } from '../users/users.module';
import { BookingCalendarEventsJob } from './booking-calendar-events.job';
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
    DeleteFutureBookingEventsService,
    ReconcileBookingCalendarEventsUseCase,
    BookingCalendarEventsJob,
    ConnectedCalendarsService,
    ListCalendarsUseCase,
    SetCheckedCalendarsUseCase,
  ],
})
export class CalendarModule {}
