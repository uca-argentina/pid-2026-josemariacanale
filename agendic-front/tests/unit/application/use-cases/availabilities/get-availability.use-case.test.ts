import { getAvailabilityUseCase } from '@/src/application/use-cases/availabilities/get-availability.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { availabilitiesWith, instrumentation } from '@/tests/unit/stubs';

const detail = { id: 7, name: 'Horario', isDefault: true, timeZone: 'UTC', schedule: [[], [], [], [], [], [], []], overrides: [] };

describe('getAvailabilityUseCase', () => {
    it('delegates to the repository and returns what it returns', async () => {
        const getAvailability = jest.fn().mockResolvedValue(detail);
        await expect(getAvailabilityUseCase(instrumentation, availabilitiesWith({ getAvailability }))(7)).resolves.toEqual(detail);
        expect(getAvailability).toHaveBeenCalledWith(7);
    });

    it('lets NotFoundError through', async () => {
        const getAvailability = jest.fn().mockRejectedValue(new NotFoundError('no existe'));
        await expect(getAvailabilityUseCase(instrumentation, availabilitiesWith({ getAvailability }))(7)).rejects.toBeInstanceOf(NotFoundError);
    });
});
