import { updateAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/update-availability.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const schedule = [[], [{ start: '09:00', end: '13:00' }], [], [], [], [], []];
const body = { availabilityId: 7, name: 'Verano', timeZone: 'UTC', schedule, overrides: [{ date: '2026-12-25', ranges: [] }] };

describe('updateAvailabilityController', () => {
    it('runs the use case with the whole body', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await updateAvailabilityController(instrumentation, signedIn, useCase)(body);
        expect(useCase).toHaveBeenCalledWith(body);
    });

    it.each([
        { ...body, availabilityId: 0 },
        { ...body, name: '  ' },
        { ...body, schedule: [[]] },
        { ...body, schedule: [[{ start: '9', end: '13:00' }], [], [], [], [], [], []] },
        { availabilityId: 7, name: 'Verano' },
    ])('throws InputParseError for %j without calling the use case', async (input) => {
        const useCase = jest.fn();
        await expect(updateAvailabilityController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(updateAvailabilityController(instrumentation, auth, useCase)(body)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
