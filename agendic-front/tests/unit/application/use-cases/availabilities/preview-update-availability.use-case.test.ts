import { previewUpdateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/preview-update-availability.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { availabilitiesWith, instrumentation } from '@/tests/unit/stubs';

const input = { availabilityId: 7, name: 'Horario', timeZone: 'UTC', schedule: [[], [], [], [], [], [], []], overrides: [] };

describe('previewUpdateAvailabilityUseCase', () => {
    it('delegates to the repository and returns the Turnos', async () => {
        const booking = { id: 9 };
        const previewUpdateAvailability = jest.fn().mockResolvedValue([booking]);
        await expect(
            previewUpdateAvailabilityUseCase(instrumentation, availabilitiesWith({ previewUpdateAvailability }))(input),
        ).resolves.toEqual([booking]);
        expect(previewUpdateAvailability).toHaveBeenCalledWith(input);
    });

    it('lets NotFoundError through', async () => {
        const previewUpdateAvailability = jest.fn().mockRejectedValue(new NotFoundError('no existe'));
        await expect(
            previewUpdateAvailabilityUseCase(instrumentation, availabilitiesWith({ previewUpdateAvailability }))(input),
        ).rejects.toBeInstanceOf(NotFoundError);
    });
});
