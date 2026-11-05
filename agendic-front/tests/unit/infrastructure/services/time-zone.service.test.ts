import { ApiRequestError } from '@/src/entities/errors/common';
import { TimeZoneService } from '@/src/infrastructure/services/time-zone.service';

const location = { lat: -34.6, lng: -58.4 };
const respond = (body: unknown, status = 200) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('TimeZoneService.getTimeZoneAt', () => {
    it('asks the Time Zone API for the punto and returns its IANA name', async () => {
        const fetchSpy = respond({ status: 'OK', timeZoneId: 'America/Argentina/Buenos_Aires' });

        await expect(new TimeZoneService('key-1').getTimeZoneAt(location)).resolves.toBe('America/Argentina/Buenos_Aires');
        const url = new URL(String(fetchSpy.mock.calls[0][0]));
        expect(url.origin + url.pathname).toBe('https://maps.googleapis.com/maps/api/timezone/json');
        expect(url.searchParams.get('location')).toBe('-34.6,-58.4');
        expect(url.searchParams.get('key')).toBe('key-1');
        expect(Number(url.searchParams.get('timestamp'))).toBeGreaterThan(0);
    });

    it.each([
        ['ZERO_RESULTS', { status: 'ZERO_RESULTS' }],
        ['REQUEST_DENIED', { status: 'REQUEST_DENIED', error_message: 'The provided API key is invalid.' }],
    ])('translates a %s to ApiRequestError', async (_case, body) => {
        respond(body);
        await expect(new TimeZoneService('key-1').getTimeZoneAt(location)).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('translates a network failure to ApiRequestError without the key in the message', async () => {
        jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('offline'));
        const error = await new TimeZoneService('key-1').getTimeZoneAt(location).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.message).not.toContain('key-1');
    });

    it('fails without calling Google when there is no key', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        await expect(new TimeZoneService('').getTimeZoneAt(location)).rejects.toBeInstanceOf(ApiRequestError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
