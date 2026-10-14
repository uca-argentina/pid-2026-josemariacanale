import {
    previewSetHolidayCountryAction,
    previewToggleHolidayAction,
    setHolidayCountryAction,
    toggleHolidayAction,
} from '@/app/(app)/availability/out-of-office/actions';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { HolidaysNotConfiguredError } from '@/src/entities/errors/holidays';
import { LeftOutsideBookingsChangedError } from '@/src/entities/errors/out-of-office';

const mockControllers: Record<string, jest.Mock> = {
    ISetHolidayCountryController: jest.fn(),
    IToggleHolidayController: jest.fn(),
    IPreviewSetHolidayCountryController: jest.fn(),
    IPreviewToggleHolidayController: jest.fn(),
};
const mockReport = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => mockControllers[key] ?? { report: mockReport },
}));
jest.mock('next/cache', () => ({ refresh: () => mockRefresh() }));
jest.mock('next/navigation', () => ({
    redirect: (path: string) => {
        throw new Error(`REDIRECT:${path}`);
    },
    unstable_rethrow: (error: Error) => {
        if (/^REDIRECT/.test(error.message)) throw error;
    },
}));

const booking = { id: 9, cancellationReason: 'Estoy de Día festivo: Navidad' };

beforeEach(() => {
    jest.clearAllMocks();
    mockControllers.ISetHolidayCountryController.mockResolvedValue({ countryCode: null, holidays: [], cancelledBookings: 0 });
    mockControllers.IToggleHolidayController.mockResolvedValue({ countryCode: null, holidays: [], cancelledBookings: 0 });
    mockControllers.IPreviewSetHolidayCountryController.mockResolvedValue([booking]);
    mockControllers.IPreviewToggleHolidayController.mockResolvedValue([booking]);
});

describe.each([
    ['previewSetHolidayCountryAction', 'IPreviewSetHolidayCountryController', () => previewSetHolidayCountryAction({ countryCode: 'ar' })],
    ['previewToggleHolidayAction', 'IPreviewToggleHolidayController', () => previewToggleHolidayAction({ holidayId: 'h1', enabled: true })],
    ['setHolidayCountryAction', 'ISetHolidayCountryController', () => setHolidayCountryAction({ countryCode: 'ar' })],
    ['toggleHolidayAction', 'IToggleHolidayController', () => toggleHolidayAction({ holidayId: 'h1', enabled: false })],
])('%s', (_name, controller, run) => {
    it('sends the Usuario to sign-in when the Sesión expired', async () => {
        mockControllers[controller].mockRejectedValue(new UnauthenticatedError('no'));
        await expect(run()).rejects.toThrow('REDIRECT:/sign-in');
    });

    it('shows the back message when Días festivos are not configured', async () => {
        mockControllers[controller].mockRejectedValue(new HolidaysNotConfiguredError('Días festivos no configurados'));
        await expect(run()).resolves.toEqual({ ok: false, message: 'Días festivos no configurados' });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('asks to review the data on an InputParseError', async () => {
        mockControllers[controller].mockRejectedValue(new InputParseError('bad'));
        await expect(run()).resolves.toEqual({ ok: false, message: 'Revisá los datos e intentá de nuevo.' });
    });

    it('reports an unexpected error and answers with a generic message', async () => {
        const error = new ApiRequestError('boom', { status: 500 });
        mockControllers[controller].mockRejectedValue(error);
        await expect(run()).resolves.toMatchObject({ ok: false });
        expect(mockReport).toHaveBeenCalledWith(error);
    });
});

describe.each([
    ['previewSetHolidayCountryAction', 'IPreviewSetHolidayCountryController', previewSetHolidayCountryAction, { countryCode: 'ar' }],
    ['previewToggleHolidayAction', 'IPreviewToggleHolidayController', previewToggleHolidayAction, { holidayId: 'h1', enabled: true }],
] as const)('%s', (_name, controller, run, input) => {
    it('returns the Turnos that would be left outside without refreshing the page', async () => {
        await expect(run(input as never)).resolves.toEqual({ ok: true, bookings: [booking] });
        expect(mockControllers[controller]).toHaveBeenCalledWith(input);
        expect(mockRefresh).not.toHaveBeenCalled();
    });
});

describe('setHolidayCountryAction', () => {
    it('sends the country with the confirmed Turnos, refreshes the page and says how many were cancelled', async () => {
        mockControllers.ISetHolidayCountryController.mockResolvedValue({ countryCode: 'ar', holidays: [], cancelledBookings: 2 });
        await expect(setHolidayCountryAction({ countryCode: 'ar' }, [4, 5])).resolves.toEqual({ ok: true, cancelledBookings: 2 });
        expect(mockControllers.ISetHolidayCountryController).toHaveBeenCalledWith({ countryCode: 'ar', cancelBookingIds: [4, 5] });
        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('answers leftOutChanged on the 409 of Turnos without refreshing the page', async () => {
        mockControllers.ISetHolidayCountryController.mockRejectedValue(new LeftOutsideBookingsChangedError('cambiaron'));
        await expect(setHolidayCountryAction({ countryCode: 'ar' }, [4])).resolves.toEqual({ ok: false, leftOutChanged: true });
        expect(mockRefresh).not.toHaveBeenCalled();
        expect(mockReport).not.toHaveBeenCalled();
    });
});

describe('toggleHolidayAction', () => {
    it('sends the Día festivo with the confirmed Turnos, refreshes the page and says how many were cancelled', async () => {
        mockControllers.IToggleHolidayController.mockResolvedValue({ countryCode: 'ar', holidays: [], cancelledBookings: 1 });
        await expect(toggleHolidayAction({ holidayId: 'h1', enabled: true }, [7])).resolves.toEqual({ ok: true, cancelledBookings: 1 });
        expect(mockControllers.IToggleHolidayController).toHaveBeenCalledWith({ holidayId: 'h1', enabled: true, cancelBookingIds: [7] });
        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('answers leftOutChanged on the 409 of Turnos without refreshing the page', async () => {
        mockControllers.IToggleHolidayController.mockRejectedValue(new LeftOutsideBookingsChangedError('cambiaron'));
        await expect(toggleHolidayAction({ holidayId: 'h1', enabled: true }, [7])).resolves.toEqual({ ok: false, leftOutChanged: true });
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it.each([
        ['toggleHolidayAction', () => toggleHolidayAction({ holidayId: 'h1', enabled: true }), 'IToggleHolidayController'],
        ['previewToggleHolidayAction', () => previewToggleHolidayAction({ holidayId: 'h1', enabled: true }), 'IPreviewToggleHolidayController'],
    ])('%s refreshes and says the Día festivo no longer exists on a NotFoundError', async (_name, run, controller) => {
        mockControllers[controller].mockRejectedValue(new NotFoundError('404'));
        await expect(run()).resolves.toEqual({ ok: false, message: 'Este Día festivo ya no existe. Actualizamos la lista.' });
        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
});
