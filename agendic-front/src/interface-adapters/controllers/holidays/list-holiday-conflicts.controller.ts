import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListHolidayConflictsUseCase } from '@/src/application/use-cases/holidays/list-holiday-conflicts.use-case';
import type { HolidayConflict } from '@/src/entities/models/holiday';

function presenter(items: HolidayConflict[], instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listHolidayConflicts Presenter', op: 'serialize' }, () => items.map(({ holidayId, holidayName, date, bookings }) => ({ holidayId, holidayName, date, bookings: bookings.map(({ id, startsAt, clientName }) => ({ id, startsAt, clientName })) })));
}

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IListHolidayConflictsController = ReturnType<typeof listHolidayConflictsController>;

/**
 * Lista los Turnos tomados en Días festivos prendidos del Usuario con Sesión.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {HolidaysNotConfiguredError} el deploy no tiene Días festivos
 */
export const listHolidayConflictsController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        listHolidayConflictsUseCase: IListHolidayConflictsUseCase,
    ) =>
    async (): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listHolidayConflicts Controller' }, async () => {
            await authenticationService.getCurrentUser();
            return presenter(await listHolidayConflictsUseCase(), instrumentationService);
        });
