import { createAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/create-availability.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });

describe('createAvailabilityController', () => {
    it('runs the use case with the trimmed name and the time zone', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await createAvailabilityController(instrumentation, signedIn, useCase)({ name: ' Verano ', timeZone: 'UTC' });
        expect(useCase).toHaveBeenCalledWith({ name: 'Verano', timeZone: 'UTC' });
    });

    it.each([{ timeZone: 'UTC' }, { name: '  ', timeZone: 'UTC' }, { name: 'Verano' }, { name: 'Verano', timeZone: '' }])(
        'throws InputParseError for %j without calling the use case',
        async (input) => {
            const useCase = jest.fn();
            await expect(createAvailabilityController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
            expect(useCase).not.toHaveBeenCalled();
        },
    );

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(
            createAvailabilityController(instrumentation, auth, useCase)({ name: 'Verano', timeZone: 'UTC' }),
        ).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
