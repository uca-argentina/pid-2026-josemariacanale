import { payDepositController } from '@/src/interface-adapters/controllers/bookings/pay-deposit.controller';
import { InputParseError } from '@/src/entities/errors/common';
import { instrumentation } from '@/tests/unit/stubs';

const confirmedBooking = {
    id: 1,
    serviceId: 2,
    employeeId: 3,
    startsAt: '2026-10-01T10:00:00.000Z',
    endsAt: '2026-10-01T10:30:00.000Z',
    status: 'CONFIRMADO' as const,
};

describe('payDepositController', () => {
    it('calls useCase and presents confirmed booking on valid input', async () => {
        const useCase = jest.fn().mockResolvedValue(confirmedBooking);

        const result = await payDepositController(instrumentation, useCase)({ bookingId: 1 });

        expect(useCase).toHaveBeenCalledWith(1);
        expect(result).toEqual(confirmedBooking);
    });

    it('throws InputParseError on negative or non-integer bookingId', async () => {
        const useCase = jest.fn();

        await expect(
            payDepositController(instrumentation, useCase)({ bookingId: -5 }),
        ).rejects.toBeInstanceOf(InputParseError);

        await expect(
            payDepositController(instrumentation, useCase)({ bookingId: 'abc' }),
        ).rejects.toBeInstanceOf(InputParseError);

        expect(useCase).not.toHaveBeenCalled();
    });
});
