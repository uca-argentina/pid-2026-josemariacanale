import { createBookingController } from '@/src/interface-adapters/controllers/bookings/create-booking.controller';
import { InputParseError } from '@/src/entities/errors/common';
import { instrumentation } from '@/tests/unit/stubs';

const booking = {
    id: 1,
    serviceId: 2,
    employeeId: 3,
    startsAt: '2026-10-01T10:00:00.000Z',
    endsAt: '2026-10-01T10:30:00.000Z',
    status: 'UNVERIFIED' as const,
};

const validPayload = {
    serviceId: 2,
    employeeId: 3,
    startsAt: '2026-10-01T10:00:00.000Z',
    clientName: 'Ana Gomez',
    clientEmail: 'ana@example.com',
};

describe('createBookingController', () => {
    it('creates and presents a booking on happy path', async () => {
        const useCase = jest.fn().mockResolvedValue(booking);

        const result = await createBookingController(instrumentation, useCase)(validPayload);

        expect(useCase).toHaveBeenCalledWith(validPayload);
        expect(result).toEqual(booking);
    });

    it('throws InputParseError on invalid email without calling useCase', async () => {
        const useCase = jest.fn();

        await expect(
            createBookingController(
                instrumentation,
                useCase,
            )({
                ...validPayload,
                clientEmail: 'not-an-email',
            }),
        ).rejects.toBeInstanceOf(InputParseError);

        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws InputParseError on empty name without calling useCase', async () => {
        const useCase = jest.fn();

        await expect(
            createBookingController(
                instrumentation,
                useCase,
            )({
                ...validPayload,
                clientName: '   ',
            }),
        ).rejects.toBeInstanceOf(InputParseError);

        expect(useCase).not.toHaveBeenCalled();
    });
});
