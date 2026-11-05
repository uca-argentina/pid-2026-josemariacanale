import { listAccountCalendarsUseCase } from '@/src/application/use-cases/calendar/list-account-calendars.use-case';
import { setCheckedCalendarsUseCase } from '@/src/application/use-cases/calendar/set-checked-calendars.use-case';
import { CalendarDisconnectedError, CalendarNotInAccountError } from '@/src/entities/errors/calendar';
import { calendarConnectionsWith, instrumentation } from '@/tests/unit/stubs';

const calendarios = [{ id: 'ana@gmail.com', name: 'Ana', primary: true, checked: true }];

describe('listAccountCalendarsUseCase', () => {
    it('returns the calendars of the account', async () => {
        const listCalendars = jest.fn().mockResolvedValue(calendarios);
        await expect(listAccountCalendarsUseCase(instrumentation, calendarConnectionsWith({ listCalendars }))()).resolves.toEqual(calendarios);
    });

    it('lets CalendarDisconnectedError through', async () => {
        const listCalendars = jest.fn().mockRejectedValue(new CalendarDisconnectedError('disconnected'));
        await expect(listAccountCalendarsUseCase(instrumentation, calendarConnectionsWith({ listCalendars }))()).rejects.toBeInstanceOf(
            CalendarDisconnectedError,
        );
    });
});

describe('setCheckedCalendarsUseCase', () => {
    it('saves the ids and returns the calendars as saved', async () => {
        const setCheckedCalendars = jest.fn().mockResolvedValue(calendarios);
        const useCase = setCheckedCalendarsUseCase(instrumentation, calendarConnectionsWith({ setCheckedCalendars }));

        await expect(useCase(['ana@gmail.com'])).resolves.toEqual(calendarios);
        expect(setCheckedCalendars).toHaveBeenCalledWith(['ana@gmail.com']);
    });

    it('lets CalendarNotInAccountError through', async () => {
        const setCheckedCalendars = jest.fn().mockRejectedValue(new CalendarNotInAccountError('Calendar x is not in the connected account'));
        const useCase = setCheckedCalendarsUseCase(instrumentation, calendarConnectionsWith({ setCheckedCalendars }));

        await expect(useCase(['x'])).rejects.toBeInstanceOf(CalendarNotInAccountError);
    });
});
