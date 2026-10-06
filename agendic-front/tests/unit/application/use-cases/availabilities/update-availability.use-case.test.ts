import { updateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/update-availability.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { availabilitiesWith, instrumentation } from '@/tests/unit/stubs';

const input = { availabilityId: 7, name: 'Horario', timeZone: 'UTC', schedule: [[], [], [], [], [], [], []], overrides: [] };

describe('updateAvailabilityUseCase', () => {
    it('delegates to the repository', async () => {
        const updateAvailability = jest.fn().mockResolvedValue(undefined);
        await updateAvailabilityUseCase(instrumentation, availabilitiesWith({ updateAvailability }))(input);
        expect(updateAvailability).toHaveBeenCalledWith(input);
    });

    it('lets NotFoundError through', async () => {
        const updateAvailability = jest.fn().mockRejectedValue(new NotFoundError('no existe'));
        await expect(updateAvailabilityUseCase(instrumentation, availabilitiesWith({ updateAvailability }))(input)).rejects.toBeInstanceOf(NotFoundError);
    });
});
