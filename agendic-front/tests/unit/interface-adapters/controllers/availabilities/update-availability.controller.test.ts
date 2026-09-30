import { updateAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/update-availability.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const interval = { weekday: 1, startTime: '09:00', endTime: '13:00' };

describe('updateAvailabilityController', () => {
    it('runs the use case with only what came in', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await updateAvailabilityController(instrumentation, signedIn, useCase)({ availabilityId: 7, intervals: [interval] });
        expect(useCase).toHaveBeenCalledWith({ availabilityId: 7, intervals: [interval] });
    });

    it.each([
        { name: 'Verano' },
        { availabilityId: 0, name: 'Verano' },
        { availabilityId: 7, name: '  ' },
        { availabilityId: 7, intervals: [{ ...interval, endTime: 'tarde' }] },
    ])('throws InputParseError for %j without calling the use case', async (input) => {
        const useCase = jest.fn();
        await expect(updateAvailabilityController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(
            updateAvailabilityController(instrumentation, auth, useCase)({ availabilityId: 7, name: 'Verano' }),
        ).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
