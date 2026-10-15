import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { HolidaysNotConfiguredError } from '@/src/entities/errors/holidays';
import { LeftOutsideBookingsChangedError } from '@/src/entities/errors/out-of-office';
import { HolidaysRepository } from '@/src/infrastructure/repositories/holidays.repository';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const settings = { countryCode: 'ar', holidays: [{ id: 'h/1', name: 'Navidad', date: '2026-12-25', enabled: true }] };

const booking = {
    id: 9,
    startsAt: '2026-12-25T13:00:00.000Z',
    endsAt: '2026-12-25T14:00:00.000Z',
    timeZone: 'America/Argentina/Buenos_Aires',
    serviceName: 'Corte',
    clientName: 'Ana',
    business: { id: 1, name: 'Spa' },
    branch: { id: 2, name: 'Centro' },
    cancellationCause: 'PUBLIC_HOLIDAY',
    cancellationReason: 'Estoy de Día festivo: Navidad',
};

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

    it('previewSetCountry POSTs the country, null included, and parses the Turnos left outside', async () => {
        const fetchSpy = respond(200, [booking]);
        await expect(repo().previewSetCountry({ countryCode: 'ar' })).resolves.toEqual([booking]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/holidays/preview',
            expect.objectContaining({ method: 'POST', body: JSON.stringify({ countryCode: 'ar' }) }),
        );
        jest.restoreAllMocks();
        const nullSpy = respond(200, []);
        await expect(repo().previewSetCountry({ countryCode: null })).resolves.toEqual([]);
        expect(nullSpy).toHaveBeenCalledWith(
            'http://api/users/me/holidays/preview',
            expect.objectContaining({ body: JSON.stringify({ countryCode: null }) }),
        );
    });

    it('setCountry PUTs the country, null included, and parses how many Turnos it cancelled', async () => {
        const fetchSpy = respond(200, { countryCode: null, holidays: [], cancelledBookings: 0 });
        await expect(repo().setCountry({ countryCode: null })).resolves.toEqual({ countryCode: null, holidays: [], cancelledBookings: 0 });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/holidays',
            expect.objectContaining({ method: 'PUT', body: JSON.stringify({ countryCode: null }) }),
        );
    });

    it('setCountry sends the confirmed Turnos', async () => {
        const fetchSpy = respond(200, { ...settings, cancelledBookings: 2 });
        await expect(repo().setCountry({ countryCode: 'ar', cancelBookingIds: [4, 5] })).resolves.toMatchObject({ cancelledBookings: 2 });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/holidays',
            expect.objectContaining({ body: JSON.stringify({ countryCode: 'ar', cancelBookingIds: [4, 5] }) }),
        );
    });

    it('previewSetEnabled POSTs the state to the escaped Día festivo id and parses the Turnos left outside', async () => {
        const fetchSpy = respond(200, [booking]);
        await expect(repo().previewSetEnabled({ holidayId: 'h/1', enabled: true })).resolves.toEqual([booking]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/holidays/h%2F1/preview',
            expect.objectContaining({ method: 'POST', body: JSON.stringify({ enabled: true }) }),
        );
    });

    it('setEnabled PATCHes the escaped Día festivo id without the id in the body', async () => {
        const fetchSpy = respond(200, { ...settings, cancelledBookings: 0 });
        await expect(repo().setEnabled({ holidayId: 'h/1', enabled: false })).resolves.toEqual({ ...settings, cancelledBookings: 0 });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/holidays/h%2F1',
            expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ enabled: false }) }),
        );
    });

    it('setEnabled sends the confirmed Turnos', async () => {
        const fetchSpy = respond(200, { ...settings, cancelledBookings: 1 });
        await repo().setEnabled({ holidayId: 'h1', enabled: true, cancelBookingIds: [7] });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/holidays/h1',
            expect.objectContaining({ body: JSON.stringify({ enabled: true, cancelBookingIds: [7] }) }),
        );
    });

    it('translates the 409 of Turnos on both writes to LeftOutsideBookingsChangedError', async () => {
        respond(409, { message: 'Los Turnos que quedan fuera de tu horario cambiaron' });
        await expect(repo().setCountry({ countryCode: 'ar', cancelBookingIds: [1] })).rejects.toBeInstanceOf(LeftOutsideBookingsChangedError);
        await expect(repo().setEnabled({ holidayId: 'h1', enabled: true, cancelBookingIds: [1] })).rejects.toBeInstanceOf(
            LeftOutsideBookingsChangedError,
        );
    });

    it('translates the 400, 404 and 503 of the previews', async () => {
        respond(400, { message: 'Unknown holiday country xx' });
        await expect(repo().previewSetCountry({ countryCode: 'xx' })).rejects.toBeInstanceOf(InputParseError);
        jest.restoreAllMocks();
        respond(404, { message: 'Holiday h1 not found' });
        await expect(repo().previewSetEnabled({ holidayId: 'h1', enabled: true })).rejects.toBeInstanceOf(NotFoundError);
        jest.restoreAllMocks();
        respond(503, { message: 'Días festivos no configurados' });
        await expect(repo().previewSetEnabled({ holidayId: 'h1', enabled: true })).rejects.toBeInstanceOf(HolidaysNotConfiguredError);
    });

    it('fails with ApiRequestError keeping the cause on an unexpected preview body', async () => {
        respond(200, [{ id: 'x' }]);
        const error = await repo().previewSetCountry({ countryCode: 'ar' }).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
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
