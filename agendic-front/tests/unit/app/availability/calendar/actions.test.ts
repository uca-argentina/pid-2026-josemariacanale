import { connectGoogleCalendarAction, disconnectCalendarAction } from '@/app/(app)/availability/calendar/actions';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { CalendarAlreadyConnectedError, CalendarNotConfiguredError } from '@/src/entities/errors/calendar';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';

const mockControllers: Record<string, jest.Mock> = {
    IStartGoogleCalendarConnectionController: jest.fn(),
    IDisconnectCalendarController: jest.fn(),
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
});

describe('connectGoogleCalendarAction', () => {
    it('returns the address to take the browser to, without refreshing', async () => {
        mockControllers.IStartGoogleCalendarConnectionController.mockResolvedValue({ authorizationUrl: 'https://accounts.google.com/x' });

        await expect(connectGoogleCalendarAction()).resolves.toEqual({ ok: true, authorizationUrl: 'https://accounts.google.com/x' });
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('flags a back without Google configured, so the option is disabled', async () => {
        mockControllers.IStartGoogleCalendarConnectionController.mockRejectedValue(new CalendarNotConfiguredError('no'));

        await expect(connectGoogleCalendarAction()).resolves.toMatchObject({ ok: false, notConfigured: true });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('refreshes the screen on a 409, since a connection already exists', async () => {
        mockControllers.IStartGoogleCalendarConnectionController.mockRejectedValue(new CalendarAlreadyConnectedError('ya'));

        await expect(connectGoogleCalendarAction()).resolves.toMatchObject({ ok: false });
        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('redirects to sign-in when the Sesión expired', async () => {
        mockControllers.IStartGoogleCalendarConnectionController.mockRejectedValue(new UnauthenticatedError('no'));
        await expect(connectGoogleCalendarAction()).rejects.toThrow('REDIRECT:/sign-in');
    });

    it('reports anything else and answers a generic message', async () => {
        const error = new ApiRequestError('boom', { status: 500 });
        mockControllers.IStartGoogleCalendarConnectionController.mockRejectedValue(error);

        await expect(connectGoogleCalendarAction()).resolves.toMatchObject({ ok: false });
        expect(mockReport).toHaveBeenCalledWith(error);
    });
});

describe('disconnectCalendarAction', () => {
    it('disconnects and refreshes the screen', async () => {
        mockControllers.IDisconnectCalendarController.mockResolvedValue(undefined);

        await expect(disconnectCalendarAction()).resolves.toEqual({ ok: true });
        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('refreshes and tells the Usuario on a 404', async () => {
        mockControllers.IDisconnectCalendarController.mockRejectedValue(new NotFoundError('no'));

        await expect(disconnectCalendarAction()).resolves.toMatchObject({ ok: false });
        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('reports anything else and answers a generic message', async () => {
        const error = new ApiRequestError('boom', { status: 500 });
        mockControllers.IDisconnectCalendarController.mockRejectedValue(error);

        await expect(disconnectCalendarAction()).resolves.toMatchObject({ ok: false });
        expect(mockReport).toHaveBeenCalledWith(error);
        expect(mockRefresh).not.toHaveBeenCalled();
    });
});
