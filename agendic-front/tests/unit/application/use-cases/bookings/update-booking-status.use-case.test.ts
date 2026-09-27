import { updateBookingStatusUseCase } from '@/src/application/use-cases/bookings/update-booking-status.use-case';
import { instrumentation } from '@/tests/unit/stubs';

const updatedBooking = {
    id: 1,
    serviceId: 2,
    employeeId: 3,
    startsAt: '2026-10-01T10:00:00.000Z',
    endsAt: '2026-10-01T10:30:00.000Z',
    status: 'ATENDIDO' as const,
};

describe('updateBookingStatusUseCase', () => {
    it('calls repository.updateStatus and returns the updated booking', async () => {
        const repo = {
            createBooking: jest.fn(),
            getServiceSlots: jest.fn(),
            payDeposit: jest.fn(),
            updateStatus: jest.fn().mockResolvedValue(updatedBooking),
        };

        const result = await updateBookingStatusUseCase(instrumentation, repo)(1, 'ATENDIDO');

        expect(repo.updateStatus).toHaveBeenCalledWith(1, 'ATENDIDO');
        expect(result).toEqual(updatedBooking);
    });
});
