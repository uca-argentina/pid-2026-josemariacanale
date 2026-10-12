import { setHolidayCountryAction, toggleHolidayAction } from '@/app/(app)/availability/out-of-office/actions';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { HolidaysNotConfiguredError } from '@/src/entities/errors/holidays';

const mockControllers: Record<string, jest.Mock> = {
    ISetHolidayCountryController: jest.fn(),
    IToggleHolidayController: jest.fn(),
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

beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockControllers).forEach((controller) => controller.mockResolvedValue({ countryCode: null, holidays: [] }));
});

describe.each([
    ['setHolidayCountryAction', 'ISetHolidayCountryController', () => setHolidayCountryAction({ countryCode: 'ar' })],
    ['toggleHolidayAction', 'IToggleHolidayController', () => toggleHolidayAction({ holidayId: 'h1', enabled: false })],
])('%s', (_name, controller, run) => {
    it('calls its controller and refreshes the page', async () => {
        await expect(run()).resolves.toEqual({ ok: true });
        expect(mockControllers[controller]).toHaveBeenCalledTimes(1);
        expect(mockRefresh).toHaveBeenCalled();
    });

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

describe('toggleHolidayAction', () => {
    it('refreshes and says the Día festivo no longer exists on a NotFoundError', async () => {
        mockControllers.IToggleHolidayController.mockRejectedValue(new NotFoundError('404'));
        await expect(toggleHolidayAction({ holidayId: 'h1', enabled: true })).resolves.toEqual({
            ok: false,
            message: 'Este Día festivo ya no existe. Actualizamos la lista.',
        });
        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
});
