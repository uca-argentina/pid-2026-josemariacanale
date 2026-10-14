import { previewSetHolidayCountryController } from '@/src/interface-adapters/controllers/holidays/preview-set-holiday-country.controller';
import { previewToggleHolidayController } from '@/src/interface-adapters/controllers/holidays/preview-toggle-holiday.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const signedOut = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
const booking = {
    id: 9,
    startsAt: '2026-12-25T13:00:00.000Z',
    endsAt: '2026-12-25T14:00:00.000Z',
    timeZone: 'America/Argentina/Buenos_Aires',
    serviceName: 'Corte',
    clientName: 'Ana',
    business: { id: 1, name: 'Spa' },
    branch: { id: 2, name: 'Centro' },
    cancellationCause: 'PUBLIC_HOLIDAY' as const,
    cancellationReason: 'Estoy de Día festivo: Navidad',
};

describe('previewSetHolidayCountryController', () => {
    it.each([['ar'], [null]])('runs the use case with countryCode %p and presents the Turnos', async (countryCode) => {
        const useCase = jest.fn().mockResolvedValue([{ ...booking, secret: 'x' }]);
        await expect(previewSetHolidayCountryController(instrumentation, signedIn, useCase)({ countryCode })).resolves.toEqual([booking]);
        expect(useCase).toHaveBeenCalledWith({ countryCode });
    });

    it.each([[{}], [{ countryCode: '' }], [{ countryCode: 5 }]])('throws InputParseError for %j without calling the use case', async (input) => {
        const useCase = jest.fn();
        await expect(previewSetHolidayCountryController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        await expect(previewSetHolidayCountryController(instrumentation, signedOut, useCase)({ countryCode: 'ar' })).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });
});

describe('previewToggleHolidayController', () => {
    it('runs the use case with the Día festivo and its state and presents the Turnos', async () => {
        const useCase = jest.fn().mockResolvedValue([{ ...booking, secret: 'x' }]);
        await expect(previewToggleHolidayController(instrumentation, signedIn, useCase)({ holidayId: 'h1', enabled: true })).resolves.toEqual([
            booking,
        ]);
        expect(useCase).toHaveBeenCalledWith({ holidayId: 'h1', enabled: true });
    });

    it.each([[{ enabled: true }], [{ holidayId: '', enabled: true }], [{ holidayId: 'h1', enabled: 'yes' }]])(
        'throws InputParseError for %j without calling the use case',
        async (input) => {
            const useCase = jest.fn();
            await expect(previewToggleHolidayController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
            expect(useCase).not.toHaveBeenCalled();
        },
    );

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        await expect(
            previewToggleHolidayController(instrumentation, signedOut, useCase)({ holidayId: 'h1', enabled: true }),
        ).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
