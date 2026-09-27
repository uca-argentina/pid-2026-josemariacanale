import { SlotConflictError } from '@/src/entities/errors/booking';
import { ApiRequestError } from '@/src/entities/errors/common';
import { BookingsRepository } from '@/src/infrastructure/repositories/bookings.repository';

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

const slotsData = {
    timeZone: 'America/Argentina/Buenos_Aires',
    days: [
        {
            date: '2026-10-01',
            slots: ['2026-10-01T13:00:00.000Z', '2026-10-01T13:30:00.000Z'],
        },
    ],
};

const repo = () => new BookingsRepository('http://api');
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
