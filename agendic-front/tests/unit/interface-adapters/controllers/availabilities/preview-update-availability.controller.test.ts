import { previewUpdateAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/preview-update-availability.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const schedule = [[], [{ start: '09:00', end: '13:00' }], [], [], [], [], []];
const body = { availabilityId: 7, name: 'Verano', timeZone: 'UTC', schedule, overrides: [{ date: '2026-12-25', ranges: [] }] };
const booking = {
    id: 9,
    startsAt: '2026-10-12T13:00:00.000Z',
    endsAt: '2026-10-12T14:00:00.000Z',
    timeZone: 'UTC',
    serviceName: 'Corte',
    clientName: 'Ana',
    business: { id: 1, name: 'Spa' },
    branch: null,
    cancellationCause: 'SCHEDULE_CHANGE' as const,
    cancellationReason: 'Cambió el horario',
};

describe('previewUpdateAvailabilityController', () => {
    it('runs the use case with the whole body and presents the Turnos', async () => {
        const useCase = jest.fn().mockResolvedValue([{ ...booking, secret: 'x' }]);
        await expect(previewUpdateAvailabilityController(instrumentation, signedIn, useCase)(body)).resolves.toEqual([booking]);
        expect(useCase).toHaveBeenCalledWith(body);
    });

    it.each([
        { ...body, availabilityId: 0 },
        { ...body, name: '  ' },
        { ...body, schedule: [[]] },
        { availabilityId: 7, name: 'Verano' },
    ])('throws InputParseError for %j without calling the use case', async (input) => {
        const useCase = jest.fn();
        await expect(previewUpdateAvailabilityController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
        await expect(previewUpdateAvailabilityController(instrumentation, auth, useCase)(body)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
