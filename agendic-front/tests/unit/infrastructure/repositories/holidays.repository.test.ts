import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { HolidaysNotConfiguredError } from '@/src/entities/errors/holidays';
import { HolidaysRepository } from '@/src/infrastructure/repositories/holidays.repository';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const settings = { countryCode: 'ar', holidays: [{ id: 'h/1', name: 'Navidad', date: '2026-12-25', enabled: true }] };

const repo = (apiUrl: string | undefined = 'http://api') =>
    new HolidaysRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), instrumentation, apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('HolidaysRepository', () => {
    it('listCountries GETs /holidays/countries with the bearer token', async () => {
        const fetchSpy = respond(200, [{ code: 'ar', name: 'Argentina' }]);
        await expect(repo().listCountries()).resolves.toEqual([{ code: 'ar', name: 'Argentina' }]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/holidays/countries',
            expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer tok' } }),
        );
    });

    it('getSettings GETs /users/me/holidays', async () => {
        const fetchSpy = respond(200, settings);
        await expect(repo().getSettings()).resolves.toEqual(settings);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me/holidays', expect.objectContaining({ method: 'GET' }));
    });

    it('setCountry PUTs the country, null included', async () => {
        const fetchSpy = respond(200, { countryCode: null, holidays: [] });
        await repo().setCountry({ countryCode: null });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/holidays',
            expect.objectContaining({ method: 'PUT', body: JSON.stringify({ countryCode: null }) }),
        );
    });

    it('setEnabled PATCHes the escaped Día festivo id', async () => {
        const fetchSpy = respond(200, settings);
        await repo().setEnabled({ holidayId: 'h/1', enabled: false });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/holidays/h%2F1',
            expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ enabled: false }) }),
        );
    });

    it('listConflicts GETs /users/me/holidays/conflicts', async () => {
        const conflicts = [
            {
                holidayId: 'h1',
                holidayName: 'Navidad',
                date: '2026-12-25',
                bookings: [{ id: 1, startsAt: '2026-12-25T13:00:00.000Z', clientName: 'Ana' }],
            },
        ];
        const fetchSpy = respond(200, conflicts);
        await expect(repo().listConflicts()).resolves.toEqual(conflicts);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me/holidays/conflicts', expect.objectContaining({ method: 'GET' }));
    });

    it.each([
        [401, UnauthenticatedError],
        [400, InputParseError],
        [404, NotFoundError],
        [503, HolidaysNotConfiguredError],
    ])('translates a %i to its domain error carrying the back message', async (status, ErrorClass) => {
        respond(status, { message: 'Días festivos no configurados' });
        const error = await repo().getSettings().catch((e) => e);
        expect(error).toBeInstanceOf(ErrorClass);
        expect(error.message).toBe('Días festivos no configurados');
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { message: 'boom' });
        await expect(repo().getSettings()).rejects.toMatchObject({ status: 500 });
    });

    it('translates an unexpected body to ApiRequestError keeping the cause', async () => {
        respond(200, { countryCode: 1 });
        const error = await repo().getSettings().catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
    });
});
