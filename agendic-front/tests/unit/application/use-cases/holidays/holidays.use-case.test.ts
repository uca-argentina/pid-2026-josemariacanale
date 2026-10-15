import { getMyHolidaysUseCase } from '@/src/application/use-cases/holidays/get-my-holidays.use-case';
import { listHolidayConflictsUseCase } from '@/src/application/use-cases/holidays/list-holiday-conflicts.use-case';
import { listHolidayCountriesUseCase } from '@/src/application/use-cases/holidays/list-holiday-countries.use-case';
import { previewSetHolidayCountryUseCase } from '@/src/application/use-cases/holidays/preview-set-holiday-country.use-case';
import { previewToggleHolidayUseCase } from '@/src/application/use-cases/holidays/preview-toggle-holiday.use-case';
import { setHolidayCountryUseCase } from '@/src/application/use-cases/holidays/set-holiday-country.use-case';
import { toggleHolidayUseCase } from '@/src/application/use-cases/holidays/toggle-holiday.use-case';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { HolidaysNotConfiguredError } from '@/src/entities/errors/holidays';
import { LeftOutsideBookingsChangedError } from '@/src/entities/errors/out-of-office';
import { holidaysWith, instrumentation } from '@/tests/unit/stubs';

const settings = { countryCode: 'ar', holidays: [{ id: 'h1', name: 'Navidad', date: '2026-12-25', enabled: true }] };

describe('holidays use cases', () => {
    it('listHolidayCountriesUseCase returns the countries', async () => {
        const countries = [{ code: 'ar', name: 'Argentina' }];
        const listCountries = jest.fn().mockResolvedValue(countries);
        await expect(listHolidayCountriesUseCase(instrumentation, holidaysWith({ listCountries }))()).resolves.toEqual(countries);
    });

    it('getMyHolidaysUseCase returns the settings', async () => {
        const getSettings = jest.fn().mockResolvedValue(settings);
        await expect(getMyHolidaysUseCase(instrumentation, holidaysWith({ getSettings }))()).resolves.toEqual(settings);
    });

    it('setHolidayCountryUseCase sends the country to the repository', async () => {
        const setCountry = jest.fn().mockResolvedValue(settings);
        await expect(setHolidayCountryUseCase(instrumentation, holidaysWith({ setCountry }))({ countryCode: 'ar' })).resolves.toEqual(settings);
        expect(setCountry).toHaveBeenCalledWith({ countryCode: 'ar' });
    });

    it('toggleHolidayUseCase sends the Día festivo and its state to the repository', async () => {
        const setEnabled = jest.fn().mockResolvedValue(settings);
        await expect(toggleHolidayUseCase(instrumentation, holidaysWith({ setEnabled }))({ holidayId: 'h1', enabled: false })).resolves.toEqual(settings);
        expect(setEnabled).toHaveBeenCalledWith({ holidayId: 'h1', enabled: false });
    });

    it('previewSetHolidayCountryUseCase returns what the repository says is left outside', async () => {
        const bookings = [{ id: 1 }];
        const previewSetCountry = jest.fn().mockResolvedValue(bookings);
        await expect(previewSetHolidayCountryUseCase(instrumentation, holidaysWith({ previewSetCountry }))({ countryCode: 'ar' })).resolves.toBe(bookings);
        expect(previewSetCountry).toHaveBeenCalledWith({ countryCode: 'ar' });
    });

    it('previewToggleHolidayUseCase returns what the repository says is left outside', async () => {
        const bookings = [{ id: 1 }];
        const previewSetEnabled = jest.fn().mockResolvedValue(bookings);
        await expect(previewToggleHolidayUseCase(instrumentation, holidaysWith({ previewSetEnabled }))({ holidayId: 'h1', enabled: true })).resolves.toBe(
            bookings,
        );
        expect(previewSetEnabled).toHaveBeenCalledWith({ holidayId: 'h1', enabled: true });
    });

    it('lets the 404, 400 and 409 errors through', async () => {
        const previewSetEnabled = jest.fn().mockRejectedValue(new NotFoundError('Holiday h1 not found'));
        await expect(previewToggleHolidayUseCase(instrumentation, holidaysWith({ previewSetEnabled }))({ holidayId: 'h1', enabled: true })).rejects.toBeInstanceOf(
            NotFoundError,
        );
        const previewSetCountry = jest.fn().mockRejectedValue(new InputParseError('Unknown holiday country xx'));
        await expect(previewSetHolidayCountryUseCase(instrumentation, holidaysWith({ previewSetCountry }))({ countryCode: 'xx' })).rejects.toBeInstanceOf(
            InputParseError,
        );
        const setCountry = jest.fn().mockRejectedValue(new LeftOutsideBookingsChangedError('cambiaron'));
        await expect(
            setHolidayCountryUseCase(instrumentation, holidaysWith({ setCountry }))({ countryCode: 'ar', cancelBookingIds: [1] }),
        ).rejects.toBeInstanceOf(LeftOutsideBookingsChangedError);
    });

    it('listHolidayConflictsUseCase returns the conflicts', async () => {
        const conflicts = [{ holidayId: 'h1', holidayName: 'Navidad', date: '2026-12-25', bookings: [] }];
        const listConflicts = jest.fn().mockResolvedValue(conflicts);
        await expect(listHolidayConflictsUseCase(instrumentation, holidaysWith({ listConflicts }))()).resolves.toEqual(conflicts);
    });

    it('lets UnauthenticatedError and HolidaysNotConfiguredError through', async () => {
        const getSettings = jest.fn().mockRejectedValueOnce(new UnauthenticatedError('no')).mockRejectedValueOnce(new HolidaysNotConfiguredError('x'));
        const run = getMyHolidaysUseCase(instrumentation, holidaysWith({ getSettings }));
        await expect(run()).rejects.toBeInstanceOf(UnauthenticatedError);
        await expect(run()).rejects.toBeInstanceOf(HolidaysNotConfiguredError);
    });
});
