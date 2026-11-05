import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { disconnectCalendarUseCase } from '@/src/application/use-cases/calendar/disconnect-calendar.use-case';
import { getCalendarConnectionUseCase } from '@/src/application/use-cases/calendar/get-calendar-connection.use-case';
import { listAccountCalendarsUseCase } from '@/src/application/use-cases/calendar/list-account-calendars.use-case';
import { setCheckedCalendarsUseCase } from '@/src/application/use-cases/calendar/set-checked-calendars.use-case';
import { startGoogleCalendarConnectionUseCase } from '@/src/application/use-cases/calendar/start-google-calendar-connection.use-case';
import { startMicrosoftCalendarConnectionUseCase } from '@/src/application/use-cases/calendar/start-microsoft-calendar-connection.use-case';
import { CalendarConnectionsRepository } from '@/src/infrastructure/repositories/calendar-connections.repository';
import { disconnectCalendarController } from '@/src/interface-adapters/controllers/calendar/disconnect-calendar.controller';
import { getMyCalendarConnectionController } from '@/src/interface-adapters/controllers/calendar/get-my-calendar-connection.controller';
import { listAccountCalendarsController } from '@/src/interface-adapters/controllers/calendar/list-account-calendars.controller';
import { setCheckedCalendarsController } from '@/src/interface-adapters/controllers/calendar/set-checked-calendars.controller';
import { startGoogleCalendarConnectionController } from '@/src/interface-adapters/controllers/calendar/start-google-calendar-connection.controller';
import { startMicrosoftCalendarConnectionController } from '@/src/interface-adapters/controllers/calendar/start-microsoft-calendar-connection.controller';

export function createCalendarModule() {
    const calendarModule = createModule();

    calendarModule.bind(DI_SYMBOLS.ICalendarConnectionsRepository).toClass(CalendarConnectionsRepository, [
        DI_SYMBOLS.IAuthenticationService,
        DI_SYMBOLS.IInstrumentationService,
    ]);

    calendarModule
        .bind(DI_SYMBOLS.IGetCalendarConnectionUseCase)
        .toHigherOrderFunction(getCalendarConnectionUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICalendarConnectionsRepository]);
    calendarModule
        .bind(DI_SYMBOLS.IStartGoogleCalendarConnectionUseCase)
        .toHigherOrderFunction(startGoogleCalendarConnectionUseCase, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.ICalendarConnectionsRepository,
        ]);
    calendarModule
        .bind(DI_SYMBOLS.IStartMicrosoftCalendarConnectionUseCase)
        .toHigherOrderFunction(startMicrosoftCalendarConnectionUseCase, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.ICalendarConnectionsRepository,
        ]);
    calendarModule
        .bind(DI_SYMBOLS.IDisconnectCalendarUseCase)
        .toHigherOrderFunction(disconnectCalendarUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICalendarConnectionsRepository]);

    calendarModule
        .bind(DI_SYMBOLS.IGetMyCalendarConnectionController)
        .toHigherOrderFunction(getMyCalendarConnectionController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IGetCalendarConnectionUseCase,
        ]);
    calendarModule
        .bind(DI_SYMBOLS.IStartGoogleCalendarConnectionController)
        .toHigherOrderFunction(startGoogleCalendarConnectionController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IStartGoogleCalendarConnectionUseCase,
        ]);
    calendarModule
        .bind(DI_SYMBOLS.IStartMicrosoftCalendarConnectionController)
        .toHigherOrderFunction(startMicrosoftCalendarConnectionController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IStartMicrosoftCalendarConnectionUseCase,
        ]);
    calendarModule
        .bind(DI_SYMBOLS.IDisconnectCalendarController)
        .toHigherOrderFunction(disconnectCalendarController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IDisconnectCalendarUseCase,
        ]);

    calendarModule
        .bind(DI_SYMBOLS.IListAccountCalendarsUseCase)
        .toHigherOrderFunction(listAccountCalendarsUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICalendarConnectionsRepository]);
    calendarModule
        .bind(DI_SYMBOLS.ISetCheckedCalendarsUseCase)
        .toHigherOrderFunction(setCheckedCalendarsUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICalendarConnectionsRepository]);

    calendarModule
        .bind(DI_SYMBOLS.IListAccountCalendarsController)
        .toHigherOrderFunction(listAccountCalendarsController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IAuthenticationService, DI_SYMBOLS.IListAccountCalendarsUseCase]);
    calendarModule
        .bind(DI_SYMBOLS.ISetCheckedCalendarsController)
        .toHigherOrderFunction(setCheckedCalendarsController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IAuthenticationService, DI_SYMBOLS.ISetCheckedCalendarsUseCase]);

    return calendarModule;
}
