import { deleteAvailabilityUseCase } from '@/src/application/use-cases/availabilities/delete-availability.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { availabilitiesWith, instrumentation } from '@/tests/unit/stubs';


describe('deleteAvailabilityUseCase', () => {
    it('delegates to the repository and returns what it returns', async () => {
        const deleteAvailability = jest.fn().mockResolvedValue(undefined);
        await expect(deleteAvailabilityUseCase(instrumentation, availabilitiesWith({ deleteAvailability }))(7)).resolves.toEqual(undefined);
        expect(deleteAvailability).toHaveBeenCalledWith(7);
    });

    it('lets NotFoundError through', async () => {
        const deleteAvailability = jest.fn().mockRejectedValue(new NotFoundError('no existe'));
        await expect(deleteAvailabilityUseCase(instrumentation, availabilitiesWith({ deleteAvailability }))(7)).rejects.toBeInstanceOf(NotFoundError);
    });
});
