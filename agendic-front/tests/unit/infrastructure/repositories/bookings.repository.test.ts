import { SlotConflictError } from '@/src/entities/errors/booking';
import { ApiRequestError } from '@/src/entities/errors/common';
import { BookingsRepository } from '@/src/infrastructure/repositories/bookings.repository';
import { authWith } from '@/tests/unit/stubs';

const booking = {
    id: 1,
    serviceId: 2,
    employeeId: 3,
    startsAt: '2026-10-01T10:00:00.000Z',
    endsAt: '2026-10-01T10:30:00.000Z',
    status: 'UNVERIFIED' as const,
};

const confirmedBooking = {
    ...booking,
    status: 'CONFIRMADO' as const,
};

const attendedBooking = {
    ...booking,
    status: 'ATENDIDO' as const,
};

const input = {
    serviceId: 2,
    employeeId: 3,
    startsAt: '2026-10-01T10:00:00.000Z',
    clientName: 'Ana Gomez',
    clientEmail: 'ana@example.com',
};

const slotsData = {
    timeZone: 'America/Argentina/Buenos_Aires',
    days: [
        {
            date: '2026-10-01',
            slots: ['2026-10-01T13:00:00.000Z', '2026-10-01T13:30:00.000Z'],
        },
    ],
};

const repo = (apiUrl: string | undefined = 'http://api') =>
    new BookingsRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('BookingsRepository.createBooking', () => {
    it('POSTs /bookings and returns the created booking', async () => {
        const fetchSpy = respond(201, booking);

        await expect(repo().createBooking(input)).resolves.toEqual(booking);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });
    });

    it('translates 409 to SlotConflictError', async () => {
        respond(409, { statusCode: 409, message: 'Overlaps a booked Turno for this Employee' });

        await expect(repo().createBooking(input)).rejects.toBeInstanceOf(SlotConflictError);
    });

    it('translates 500 to ApiRequestError carrying status', async () => {
        respond(500, { statusCode: 500, message: 'Server error' });

        await expect(repo().createBooking(input)).rejects.toMatchObject({ status: 500 });
    });

    it('translates network failure to ApiRequestError without status', async () => {
        jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('offline'));

        await expect(repo().createBooking(input)).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('BookingsRepository.getServiceSlots', () => {
    it('GETs /services/:id/slots with query parameters and returns slots', async () => {
        const fetchSpy = respond(200, slotsData);

        await expect(repo().getServiceSlots(2, 3, '2026-10-01', '2026-10-07')).resolves.toEqual(slotsData);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/services/2/slots?employeeId=3&from=2026-10-01&to=2026-10-07',
        );
    });

    it('translates failure to ApiRequestError', async () => {
        respond(422, { statusCode: 422, message: 'Range too large' });

        await expect(repo().getServiceSlots(2, 3, '2026-10-01', '2026-12-01')).rejects.toMatchObject({ status: 422 });
    });
});

describe('BookingsRepository.payDeposit', () => {
    it('POSTs /bookings/:id/pay-deposit and returns the confirmed booking', async () => {
        const fetchSpy = respond(200, confirmedBooking);

        await expect(repo().payDeposit(1)).resolves.toEqual(confirmedBooking);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/bookings/1/pay-deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
    });

    it('translates failure to ApiRequestError carrying status', async () => {
        respond(400, { statusCode: 400, message: 'Deposit already paid' });

        await expect(repo().payDeposit(1)).rejects.toMatchObject({ status: 400 });
    });
});

describe('BookingsRepository.updateStatus', () => {
    it('PATCHes /bookings/:id/status with bearer token and returns updated booking', async () => {
        const fetchSpy = respond(200, attendedBooking);

        await expect(repo().updateStatus(1, 'ATENDIDO')).resolves.toEqual(attendedBooking);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/bookings/1/status', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer tok',
            },
            body: JSON.stringify({ status: 'ATENDIDO' }),
        });
    });

    it('translates failure to ApiRequestError carrying status', async () => {
        respond(403, { statusCode: 403, message: 'Forbidden' });

        await expect(repo().updateStatus(1, 'ATENDIDO')).rejects.toMatchObject({ status: 403 });
    });
});
