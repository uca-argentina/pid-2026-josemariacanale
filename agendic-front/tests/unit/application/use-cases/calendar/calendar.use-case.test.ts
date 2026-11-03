import { disconnectCalendarUseCase } from '@/src/application/use-cases/calendar/disconnect-calendar.use-case';
import { getCalendarConnectionUseCase } from '@/src/application/use-cases/calendar/get-calendar-connection.use-case';
import { startGoogleCalendarConnectionUseCase } from '@/src/application/use-cases/calendar/start-google-calendar-connection.use-case';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { CalendarAlreadyConnectedError } from '@/src/entities/errors/calendar';
import { NotFoundError } from '@/src/entities/errors/common';
import { calendarConnectionsWith, instrumentation } from '@/tests/unit/stubs';

const conexion = { provider: 'GOOGLE' as const, email: 'ana@gmail.com', status: 'CONNECTED' as const, connectedAt: '2026-11-01T10:00:00.000Z' };

describe('getCalendarConnectionUseCase', () => {
    it('returns the Calendario conectado', async () => {
        const getConnection = jest.fn().mockResolvedValue(conexion);
        await expect(getCalendarConnectionUseCase(instrumentation, calendarConnectionsWith({ getConnection }))()).resolves.toEqual(conexion);
    });

    it('returns null when there is none', async () => {
        const getConnection = jest.fn().mockResolvedValue(null);
        await expect(getCalendarConnectionUseCase(instrumentation, calendarConnectionsWith({ getConnection }))()).resolves.toBeNull();
    });

    it('lets UnauthenticatedError through', async () => {
        const getConnection = jest.fn().mockRejectedValue(new UnauthenticatedError('no'));
        await expect(getCalendarConnectionUseCase(instrumentation, calendarConnectionsWith({ getConnection }))()).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
    });
});

describe('startGoogleCalendarConnectionUseCase', () => {
    it('returns the address Google asks the Usuario to go to', async () => {
        const startGoogleConnection = jest.fn().mockResolvedValue({ authorizationUrl: 'https://accounts.google.com/o/oauth2/auth' });
        await expect(
            startGoogleCalendarConnectionUseCase(instrumentation, calendarConnectionsWith({ startGoogleConnection }))(),
        ).resolves.toEqual({ authorizationUrl: 'https://accounts.google.com/o/oauth2/auth' });
    });

    it('lets CalendarAlreadyConnectedError through', async () => {
        const startGoogleConnection = jest.fn().mockRejectedValue(new CalendarAlreadyConnectedError('Calendar already connected for User 1'));
        await expect(
            startGoogleCalendarConnectionUseCase(instrumentation, calendarConnectionsWith({ startGoogleConnection }))(),
        ).rejects.toBeInstanceOf(CalendarAlreadyConnectedError);
    });
});

describe('disconnectCalendarUseCase', () => {
    it('delegates to the repository', async () => {
        const disconnect = jest.fn().mockResolvedValue(undefined);
        await disconnectCalendarUseCase(instrumentation, calendarConnectionsWith({ disconnect }))();
        expect(disconnect).toHaveBeenCalledTimes(1);
    });

    it('lets NotFoundError through', async () => {
        const disconnect = jest.fn().mockRejectedValue(new NotFoundError('User 1 has no Calendario conectado'));
        await expect(disconnectCalendarUseCase(instrumentation, calendarConnectionsWith({ disconnect }))()).rejects.toBeInstanceOf(NotFoundError);
    });
});
