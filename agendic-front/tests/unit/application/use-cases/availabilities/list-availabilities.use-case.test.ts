import { listAvailabilitiesUseCase } from '@/src/application/use-cases/availabilities/list-availabilities.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { availabilitiesWith, instrumentation } from '@/tests/unit/stubs';


describe('listAvailabilitiesUseCase', () => {
    it('delegates to the repository and returns what it returns', async () => {
        const listAvailabilities = jest.fn().mockResolvedValue([]);
        await expect(listAvailabilitiesUseCase(instrumentation, availabilitiesWith({ listAvailabilities }))(7)).resolves.toEqual([]);
        expect(listAvailabilities).toHaveBeenCalledWith(7);
    });

    it('lets NotFoundError through', async () => {
        const listAvailabilities = jest.fn().mockRejectedValue(new NotFoundError('no existe'));
        await expect(listAvailabilitiesUseCase(instrumentation, availabilitiesWith({ listAvailabilities }))(7)).rejects.toBeInstanceOf(NotFoundError);
    });
});
