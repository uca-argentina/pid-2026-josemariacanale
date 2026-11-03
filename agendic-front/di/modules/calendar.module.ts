import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { disconnectCalendarUseCase } from '@/src/application/use-cases/calendar/disconnect-calendar.use-case';
import { getCalendarConnectionUseCase } from '@/src/application/use-cases/calendar/get-calendar-connection.use-case';
import { startGoogleCalendarConnectionUseCase } from '@/src/application/use-cases/calendar/start-google-calendar-connection.use-case';
import { CalendarConnectionsRepository } from '@/src/infrastructure/repositories/calendar-connections.repository';
import { disconnectCalendarController } from '@/src/interface-adapters/controllers/calendar/disconnect-calendar.controller';
import { getMyCalendarConnectionController } from '@/src/interface-adapters/controllers/calendar/get-my-calendar-connection.controller';
import { startGoogleCalendarConnectionController } from '@/src/interface-adapters/controllers/calendar/start-google-calendar-connection.controller';

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
        .bind(DI_SYMBOLS.IDisconnectCalendarController)
        .toHigherOrderFunction(disconnectCalendarController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IDisconnectCalendarUseCase,
        ]);

    return calendarModule;
}
