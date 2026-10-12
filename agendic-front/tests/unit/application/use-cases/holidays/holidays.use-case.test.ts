import { getMyHolidaysUseCase } from '@/src/application/use-cases/holidays/get-my-holidays.use-case';
import { listHolidayConflictsUseCase } from '@/src/application/use-cases/holidays/list-holiday-conflicts.use-case';
import { listHolidayCountriesUseCase } from '@/src/application/use-cases/holidays/list-holiday-countries.use-case';
import { setHolidayCountryUseCase } from '@/src/application/use-cases/holidays/set-holiday-country.use-case';
import { toggleHolidayUseCase } from '@/src/application/use-cases/holidays/toggle-holiday.use-case';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { HolidaysNotConfiguredError } from '@/src/entities/errors/holidays';
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
