import { payDepositUseCase } from '@/src/application/use-cases/bookings/pay-deposit.use-case';
import { instrumentation } from '@/tests/unit/stubs';

const confirmedBooking = {
    id: 1,
    serviceId: 2,
    employeeId: 3,
    startsAt: '2026-10-01T10:00:00.000Z',
    endsAt: '2026-10-01T10:30:00.000Z',
    status: 'CONFIRMADO' as const,
};

describe('payDepositUseCase', () => {
    it('calls repository.payDeposit and returns the confirmed booking', async () => {
        const repo = {
            createBooking: jest.fn(),
            getServiceSlots: jest.fn(),
            payDeposit: jest.fn().mockResolvedValue(confirmedBooking),
            updateStatus: jest.fn(),
        };

        const result = await payDepositUseCase(instrumentation, repo)(1);

        expect(repo.payDeposit).toHaveBeenCalledWith(1);
        expect(result).toEqual(confirmedBooking);
    });
});
