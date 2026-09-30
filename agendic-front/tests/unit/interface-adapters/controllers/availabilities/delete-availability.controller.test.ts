import { deleteAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/delete-availability.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });

describe('deleteAvailabilityController', () => {
    it('deletes the Availability by id', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await deleteAvailabilityController(instrumentation, signedIn, useCase)({ availabilityId: 7 });
        expect(useCase).toHaveBeenCalledWith(7);
    });

    it.each([{}, { availabilityId: '7' }, { availabilityId: 0 }, { availabilityId: 1.5 }])(
        'throws InputParseError for %j without calling the use case',
        async (input) => {
            const useCase = jest.fn();
            await expect(deleteAvailabilityController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
            expect(useCase).not.toHaveBeenCalled();
        },
    );

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(deleteAvailabilityController(instrumentation, auth, useCase)({ availabilityId: 7 })).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });
});
