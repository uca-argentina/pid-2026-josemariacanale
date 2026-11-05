import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { listAccountCalendarsController } from '@/src/interface-adapters/controllers/calendar/list-account-calendars.controller';
import { setCheckedCalendarsController } from '@/src/interface-adapters/controllers/calendar/set-checked-calendars.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const signedOut = () => authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
const calendarios = [{ id: 'ana@gmail.com', name: 'Ana', primary: true, checked: true }];

describe('listAccountCalendarsController', () => {
    it('returns the calendars, whitelisting their fields', async () => {
        const list = jest.fn().mockResolvedValue([{ ...calendarios[0], accessRole: 'owner' }]);
        await expect(listAccountCalendarsController(instrumentation, signedIn, list)()).resolves.toEqual(calendarios);
    });

    it('throws UnauthenticatedError without asking', async () => {
        const list = jest.fn();
        await expect(listAccountCalendarsController(instrumentation, signedOut(), list)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(list).not.toHaveBeenCalled();
    });
});

describe('setCheckedCalendarsController', () => {
    it('saves the checked ids and returns the calendars', async () => {
        const save = jest.fn().mockResolvedValue(calendarios);
        await expect(setCheckedCalendarsController(instrumentation, signedIn, save)({ checkedIds: ['ana@gmail.com'] })).resolves.toEqual(calendarios);
        expect(save).toHaveBeenCalledWith(['ana@gmail.com']);
    });

    it('accepts an empty list', async () => {
        const save = jest.fn().mockResolvedValue([]);
        await setCheckedCalendarsController(instrumentation, signedIn, save)({ checkedIds: [] });
        expect(save).toHaveBeenCalledWith([]);
    });

    it.each([[{}], [{ checkedIds: 'ana' }], [{ checkedIds: [1] }]])('rejects %j as InputParseError without saving', async (input) => {
        const save = jest.fn();
        await expect(setCheckedCalendarsController(instrumentation, signedIn, save)(input as never)).rejects.toBeInstanceOf(InputParseError);
        expect(save).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError without saving', async () => {
        const save = jest.fn();
        await expect(setCheckedCalendarsController(instrumentation, signedOut(), save)({ checkedIds: [] })).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(save).not.toHaveBeenCalled();
    });
});
