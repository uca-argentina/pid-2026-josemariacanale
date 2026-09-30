import { bookSlotUseCase } from '@/src/application/use-cases/bookings/book-slot.use-case';
import { SlotTakenError } from '@/src/entities/errors/booking';
import { bookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('bookSlotUseCase', () => {
    const booking = {
        id: 7,
        serviceId: 100,
        employeeId: 1,
        startsAt: '2026-09-28T12:00:00.000Z',
        endsAt: '2026-09-28T13:00:00.000Z',
        status: 'UNVERIFIED' as const,
        notes: null,
    };

    it('books the Horario reservable with the Cliente and their Comentario del Turno', async () => {
        const book = jest.fn().mockResolvedValue({ ...booking, notes: 'Llego 5 minutos tarde' });

        await expect(
            bookSlotUseCase(instrumentation, bookingsWith({ book }))({
                serviceId: 100,
                employeeId: 1,
                startsAt: '2026-09-28T12:00:00.000Z',
                clientName: 'Juana Pérez',
                clientEmail: 'juana@example.com',
                notes: 'Llego 5 minutos tarde',
            }),
        ).resolves.toMatchObject({ id: 7, notes: 'Llego 5 minutos tarde' });
        expect(book).toHaveBeenCalledWith({
            serviceId: 100,
            employeeId: 1,
            startsAt: '2026-09-28T12:00:00.000Z',
            clientName: 'Juana Pérez',
            clientEmail: 'juana@example.com',
            notes: 'Llego 5 minutos tarde',
        });
    });

    it.each([
        ['no Comentario del Turno', undefined],
        ['an empty Comentario del Turno', ''],
    ])('leaves notes out of the body with %s', async (_case, notes) => {
        const book = jest.fn().mockResolvedValue(booking);

        await bookSlotUseCase(instrumentation, bookingsWith({ book }))({
            serviceId: 100,
            employeeId: 1,
            startsAt: '2026-09-28T12:00:00.000Z',
            clientName: 'Juana Pérez',
            clientEmail: 'juana@example.com',
            notes,
        });
        expect(book.mock.calls[0][0]).not.toHaveProperty('notes');
    });

    it('lets a Horario reservable taken meanwhile through as SlotTakenError', async () => {
        const book = jest.fn().mockRejectedValue(new SlotTakenError('Overlaps a booked Turno for this Employee'));
        await expect(
            bookSlotUseCase(instrumentation, bookingsWith({ book }))({
                serviceId: 100,
                employeeId: 1,
                startsAt: '2026-09-28T12:00:00.000Z',
                clientName: 'Juana Pérez',
                clientEmail: 'juana@example.com',
            }),
        ).rejects.toBeInstanceOf(SlotTakenError);
    });
});
