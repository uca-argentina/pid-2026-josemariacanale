import { getTimeZoneUseCase } from '@/src/application/use-cases/branches/get-time-zone.use-case';
import { ApiRequestError } from '@/src/entities/errors/common';
import { instrumentation } from '@/tests/unit/stubs';

const location = { lat: -34.6, lng: -58.4 };

describe('getTimeZoneUseCase', () => {
    it('returns the zona horaria of the punto', async () => {
        const getTimeZoneAt = jest.fn().mockResolvedValue('America/Argentina/Buenos_Aires');

        await expect(getTimeZoneUseCase(instrumentation, { getTimeZoneAt })(location)).resolves.toBe('America/Argentina/Buenos_Aires');
        expect(getTimeZoneAt).toHaveBeenCalledWith(location);
    });

    it('lets the failure of the provider through', async () => {
        const getTimeZoneAt = jest.fn().mockRejectedValue(new ApiRequestError('ZERO_RESULTS'));

        await expect(getTimeZoneUseCase(instrumentation, { getTimeZoneAt })(location)).rejects.toBeInstanceOf(ApiRequestError);
    });
});
