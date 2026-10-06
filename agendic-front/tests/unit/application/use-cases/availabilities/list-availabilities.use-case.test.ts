import { listAvailabilitiesUseCase } from '@/src/application/use-cases/availabilities/list-availabilities.use-case';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { availabilitiesWith, instrumentation } from '@/tests/unit/stubs';

describe('listAvailabilitiesUseCase', () => {
    it('delegates to the repository and returns what it returns', async () => {
        const listAvailabilities = jest.fn().mockResolvedValue([]);
        await expect(listAvailabilitiesUseCase(instrumentation, availabilitiesWith({ listAvailabilities }))()).resolves.toEqual([]);
        expect(listAvailabilities).toHaveBeenCalledWith();
    });

    it('lets UnauthenticatedError through', async () => {
        const listAvailabilities = jest.fn().mockRejectedValue(new UnauthenticatedError('no'));
        await expect(listAvailabilitiesUseCase(instrumentation, availabilitiesWith({ listAvailabilities }))()).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
    });
});
