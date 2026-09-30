import { makeAvailabilityDefaultUseCase } from '@/src/application/use-cases/availabilities/make-availability-default.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { availabilitiesWith, instrumentation } from '@/tests/unit/stubs';

const availability = { id: 7, employeeId: 3, name: 'Horario', isDefault: true, intervals: [] };

describe('makeAvailabilityDefaultUseCase', () => {
    it('delegates to the repository and returns what it returns', async () => {
        const makeDefault = jest.fn().mockResolvedValue(availability);
        await expect(makeAvailabilityDefaultUseCase(instrumentation, availabilitiesWith({ makeDefault }))(7)).resolves.toEqual(availability);
        expect(makeDefault).toHaveBeenCalledWith(7);
    });

    it('lets NotFoundError through', async () => {
        const makeDefault = jest.fn().mockRejectedValue(new NotFoundError('no existe'));
        await expect(makeAvailabilityDefaultUseCase(instrumentation, availabilitiesWith({ makeDefault }))(7)).rejects.toBeInstanceOf(NotFoundError);
    });
});
