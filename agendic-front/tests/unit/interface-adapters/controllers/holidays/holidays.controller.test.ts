import { getMyHolidaysController } from '@/src/interface-adapters/controllers/holidays/get-my-holidays.controller';
import { listHolidayConflictsController } from '@/src/interface-adapters/controllers/holidays/list-holiday-conflicts.controller';
import { listHolidayCountriesController } from '@/src/interface-adapters/controllers/holidays/list-holiday-countries.controller';
import { setHolidayCountryController } from '@/src/interface-adapters/controllers/holidays/set-holiday-country.controller';
import { toggleHolidayController } from '@/src/interface-adapters/controllers/holidays/toggle-holiday.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const signedOut = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
const holiday = { id: 'h1', name: 'Navidad', date: '2026-12-25', enabled: true };
const settings = { countryCode: 'ar', holidays: [holiday] };

describe('getMyHolidaysController', () => {
    it('returns the settings, whitelisting the fields', async () => {
        const get = jest.fn().mockResolvedValue({ ...settings, holidays: [{ ...holiday, extra: 1 }] });
        await expect(getMyHolidaysController(instrumentation, signedIn, get)()).resolves.toEqual(settings);
    });

    it('throws UnauthenticatedError without calling the use case', async () => {
        const get = jest.fn();
        await expect(getMyHolidaysController(instrumentation, signedOut, get)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(get).not.toHaveBeenCalled();
    });
});

describe('listHolidayCountriesController', () => {
    it('returns code and name of each country', async () => {
        const list = jest.fn().mockResolvedValue([{ code: 'ar', name: 'Argentina', extra: 1 }]);
        await expect(listHolidayCountriesController(instrumentation, signedIn, list)()).resolves.toEqual([{ code: 'ar', name: 'Argentina' }]);
    });

    it('throws UnauthenticatedError without calling the use case', async () => {
        const list = jest.fn();
        await expect(listHolidayCountriesController(instrumentation, signedOut, list)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(list).not.toHaveBeenCalled();
    });
});

describe('listHolidayConflictsController', () => {
    const conflict = {
        holidayId: 'h1',
        holidayName: 'Navidad',
        date: '2026-12-25',
        bookings: [{ id: 3, startsAt: '2026-12-25T13:00:00.000Z', clientName: 'Ana' }],
    };

    it('returns the conflicts, whitelisting the fields', async () => {
        const list = jest.fn().mockResolvedValue([{ ...conflict, extra: 1 }]);
        await expect(listHolidayConflictsController(instrumentation, signedIn, list)()).resolves.toEqual([conflict]);
    });

    it('throws UnauthenticatedError without calling the use case', async () => {
        const list = jest.fn();
        await expect(listHolidayConflictsController(instrumentation, signedOut, list)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(list).not.toHaveBeenCalled();
    });
});

describe('setHolidayCountryController', () => {
    it.each([['ar'], [null]])('passes countryCode %p to the use case', async (countryCode) => {
        const set = jest.fn().mockResolvedValue(settings);
        await expect(setHolidayCountryController(instrumentation, signedIn, set)({ countryCode })).resolves.toEqual(settings);
        expect(set).toHaveBeenCalledWith({ countryCode });
    });

    it.each([[{}], [{ countryCode: '' }], [{ countryCode: 5 }]])('rejects %j without calling the use case', async (input) => {
        const set = jest.fn();
        await expect(setHolidayCountryController(instrumentation, signedIn, set)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(set).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError without calling the use case', async () => {
        const set = jest.fn();
        await expect(setHolidayCountryController(instrumentation, signedOut, set)({ countryCode: 'ar' })).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(set).not.toHaveBeenCalled();
    });
});

describe('toggleHolidayController', () => {
    it('passes the Día festivo and its state to the use case', async () => {
        const toggle = jest.fn().mockResolvedValue(settings);
        await expect(toggleHolidayController(instrumentation, signedIn, toggle)({ holidayId: 'h1', enabled: false })).resolves.toEqual(settings);
        expect(toggle).toHaveBeenCalledWith({ holidayId: 'h1', enabled: false });
    });

    it.each([[{ enabled: true }], [{ holidayId: '', enabled: true }], [{ holidayId: 'h1', enabled: 'yes' }]])(
        'rejects %j without calling the use case',
        async (input) => {
            const toggle = jest.fn();
            await expect(toggleHolidayController(instrumentation, signedIn, toggle)(input)).rejects.toBeInstanceOf(InputParseError);
            expect(toggle).not.toHaveBeenCalled();
        },
    );

    it('throws UnauthenticatedError without calling the use case', async () => {
        const toggle = jest.fn();
        await expect(toggleHolidayController(instrumentation, signedOut, toggle)({ holidayId: 'h1', enabled: true })).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(toggle).not.toHaveBeenCalled();
    });
});
