import { updateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/update-availability.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { availabilitiesWith, instrumentation } from '@/tests/unit/stubs';

const availability = { id: 7, employeeId: 3, name: 'Horario', isDefault: true, intervals: [] };
const input = { availabilityId: 7, name: 'Horario' };

describe('updateAvailabilityUseCase', () => {
    it('delegates to the repository and returns what it returns', async () => {
        const updateAvailability = jest.fn().mockResolvedValue(availability);
        await expect(updateAvailabilityUseCase(instrumentation, availabilitiesWith({ updateAvailability }))(input)).resolves.toEqual(availability);
        expect(updateAvailability).toHaveBeenCalledWith(input);
    });

    it('lets NotFoundError through', async () => {
        const updateAvailability = jest.fn().mockRejectedValue(new NotFoundError('no existe'));
        await expect(updateAvailabilityUseCase(instrumentation, availabilitiesWith({ updateAvailability }))(input)).rejects.toBeInstanceOf(NotFoundError);
    });
});
