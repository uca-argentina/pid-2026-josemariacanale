import { createBookingUseCase } from '@/src/application/use-cases/bookings/create-booking.use-case';
import { instrumentation } from '@/tests/unit/stubs';

const booking = {
    id: 1,
    serviceId: 2,
    employeeId: 3,
    startsAt: '2026-10-01T10:00:00.000Z',
    endsAt: '2026-10-01T10:30:00.000Z',
    status: 'UNVERIFIED' as const,
};

const input = {
    serviceId: 2,
    employeeId: 3,
    startsAt: '2026-10-01T10:00:00.000Z',
    clientName: 'Ana Gomez',
    clientEmail: 'ana@example.com',
};

describe('createBookingUseCase', () => {
    it('creates a booking through repository', async () => {
        const repo = {
            createBooking: jest.fn().mockResolvedValue(booking),
            getServiceSlots: jest.fn(),
            payDeposit: jest.fn(),
            updateStatus: jest.fn(),
        };

        const result = await createBookingUseCase(instrumentation, repo)(input);

        expect(repo.createBooking).toHaveBeenCalledWith(input);
        expect(result).toEqual(booking);
    });
});
