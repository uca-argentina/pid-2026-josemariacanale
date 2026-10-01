import { InputParseError } from '@/src/entities/errors/common';
import { verifyBookingController } from '@/src/interface-adapters/controllers/bookings/verify-booking.controller';
import { instrumentation } from '@/tests/unit/stubs';

describe('verifyBookingController', () => {
    it('verifies with the trimmed token and presents the Turno with its real state', async () => {
        const useCase = jest.fn().mockResolvedValue({
            id: 7,
            serviceId: 100,
            employeeId: 1,
            startsAt: '2026-09-28T12:00:00.000Z',
            endsAt: '2026-09-28T13:00:00.000Z',
            status: 'PENDING',
        });

        await expect(verifyBookingController(instrumentation, useCase)({ token: ' abc ' })).resolves.toEqual({
            id: 7,
            startsAt: '2026-09-28T12:00:00.000Z',
            endsAt: '2026-09-28T13:00:00.000Z',
            status: 'PENDING',
        });
        expect(useCase).toHaveBeenCalledWith('abc');
    });

    it.each([
        ['a missing token', {}],
        ['a blank token', { token: '   ' }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(verifyBookingController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
