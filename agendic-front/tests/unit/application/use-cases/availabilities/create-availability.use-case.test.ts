import { createAvailabilityUseCase } from '@/src/application/use-cases/availabilities/create-availability.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { availabilitiesWith, instrumentation } from '@/tests/unit/stubs';

const availability = { id: 7, employeeId: 3, name: 'Horario', isDefault: true, intervals: [] };
const input = { employeeId: 3, name: 'Horario', intervals: [] };

describe('createAvailabilityUseCase', () => {
    it('delegates to the repository and returns what it returns', async () => {
        const createAvailability = jest.fn().mockResolvedValue(availability);
        await expect(createAvailabilityUseCase(instrumentation, availabilitiesWith({ createAvailability }))(input)).resolves.toEqual(availability);
        expect(createAvailability).toHaveBeenCalledWith(input);
    });

    it('lets NotFoundError through', async () => {
        const createAvailability = jest.fn().mockRejectedValue(new NotFoundError('no existe'));
        await expect(createAvailabilityUseCase(instrumentation, availabilitiesWith({ createAvailability }))(input)).rejects.toBeInstanceOf(NotFoundError);
    });
});
