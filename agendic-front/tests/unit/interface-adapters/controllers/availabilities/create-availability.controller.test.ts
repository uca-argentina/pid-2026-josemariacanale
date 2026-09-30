import { createAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/create-availability.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const interval = { weekday: 1, startTime: '09:00', endTime: '13:00' };

describe('createAvailabilityController', () => {
    it('runs the use case with the trimmed name and the Franjas', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await createAvailabilityController(instrumentation, signedIn, useCase)({ employeeId: 3, name: ' Verano ', intervals: [interval] });
        expect(useCase).toHaveBeenCalledWith({ employeeId: 3, name: 'Verano', intervals: [interval] });
    });

    it('accepts no Franjas at all', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await createAvailabilityController(instrumentation, signedIn, useCase)({ employeeId: 3, name: 'Verano', intervals: [] });
        expect(useCase).toHaveBeenCalled();
    });

    it.each([
        { name: 'Verano', intervals: [] },
        { employeeId: 3, name: '  ', intervals: [] },
        { employeeId: 3, name: 'Verano' },
        { employeeId: 3, name: 'Verano', intervals: [{ ...interval, weekday: 7 }] },
        { employeeId: 3, name: 'Verano', intervals: [{ ...interval, startTime: '9:00' }] },
    ])('throws InputParseError for %j without calling the use case', async (input) => {
        const useCase = jest.fn();
        await expect(createAvailabilityController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(
            createAvailabilityController(instrumentation, auth, useCase)({ employeeId: 3, name: 'Verano', intervals: [] }),
        ).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
