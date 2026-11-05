import { disconnectCalendarController } from '@/src/interface-adapters/controllers/calendar/disconnect-calendar.controller';
import { getMyCalendarConnectionController } from '@/src/interface-adapters/controllers/calendar/get-my-calendar-connection.controller';
import { startGoogleCalendarConnectionController } from '@/src/interface-adapters/controllers/calendar/start-google-calendar-connection.controller';
import { startMicrosoftCalendarConnectionController } from '@/src/interface-adapters/controllers/calendar/start-microsoft-calendar-connection.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const signedOut = () => authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
const conexion = { provider: 'GOOGLE' as const, email: 'ana@gmail.com', status: 'CONNECTED' as const, connectedAt: '2026-11-01T10:00:00.000Z' };

describe('getMyCalendarConnectionController', () => {
    it('returns the Calendario conectado, whitelisting its fields', async () => {
        const get = jest.fn().mockResolvedValue({ ...conexion, encryptedRefreshToken: 'secreto' });
        await expect(getMyCalendarConnectionController(instrumentation, signedIn, get)()).resolves.toEqual(conexion);
    });

    it('returns null when there is none', async () => {
        const get = jest.fn().mockResolvedValue(null);
        await expect(getMyCalendarConnectionController(instrumentation, signedIn, get)()).resolves.toBeNull();
    });

    it('throws UnauthenticatedError without asking', async () => {
        const get = jest.fn();
        await expect(getMyCalendarConnectionController(instrumentation, signedOut(), get)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(get).not.toHaveBeenCalled();
    });
});

describe('startGoogleCalendarConnectionController', () => {
    it('returns the authorization address', async () => {
        const start = jest.fn().mockResolvedValue({ authorizationUrl: 'https://accounts.google.com/x', state: 'otro' });
        await expect(startGoogleCalendarConnectionController(instrumentation, signedIn, start)()).resolves.toEqual({
            authorizationUrl: 'https://accounts.google.com/x',
        });
    });

    it('throws UnauthenticatedError without starting', async () => {
        const start = jest.fn();
        await expect(startGoogleCalendarConnectionController(instrumentation, signedOut(), start)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(start).not.toHaveBeenCalled();
    });
});

describe('startMicrosoftCalendarConnectionController', () => {
    it('returns the authorization address', async () => {
        const start = jest.fn().mockResolvedValue({ authorizationUrl: 'https://login.microsoftonline.com/x', state: 'otro' });
        await expect(startMicrosoftCalendarConnectionController(instrumentation, signedIn, start)()).resolves.toEqual({
            authorizationUrl: 'https://login.microsoftonline.com/x',
        });
    });

    it('throws UnauthenticatedError without starting', async () => {
        const start = jest.fn();
        await expect(startMicrosoftCalendarConnectionController(instrumentation, signedOut(), start)()).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(start).not.toHaveBeenCalled();
    });
});

describe('disconnectCalendarController', () => {
    it('disconnects the Calendario conectado', async () => {
        const disconnect = jest.fn().mockResolvedValue(undefined);
        await disconnectCalendarController(instrumentation, signedIn, disconnect)();
        expect(disconnect).toHaveBeenCalledTimes(1);
    });

    it('throws UnauthenticatedError without disconnecting', async () => {
        const disconnect = jest.fn();
        await expect(disconnectCalendarController(instrumentation, signedOut(), disconnect)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(disconnect).not.toHaveBeenCalled();
    });
});
