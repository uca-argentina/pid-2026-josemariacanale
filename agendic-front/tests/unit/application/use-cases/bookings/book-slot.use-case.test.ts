import { bookSlotUseCase } from '@/src/application/use-cases/bookings/book-slot.use-case';
import { InvalidVerificationCodeError, SlotTakenError } from '@/src/entities/errors/booking';
import { bookingsWith, instrumentation } from '@/tests/unit/stubs';

describe('bookSlotUseCase', () => {
    const booking = {
        id: 7,
        serviceId: 100,
        startsAt: '2026-09-28T12:00:00.000Z',
        endsAt: '2026-09-28T13:00:00.000Z',
        status: 'BOOKED' as const,
        notes: null,
    };

    it('books the Horario reservable with the Cliente, su Código de verificación y su Comentario del Turno', async () => {
        const book = jest.fn().mockResolvedValue({ ...booking, notes: 'Llego 5 minutos tarde' });

        await expect(
            bookSlotUseCase(instrumentation, bookingsWith({ book }))({
                serviceId: 100,
                startsAt: '2026-09-28T12:00:00.000Z',
                clientName: 'Juana Pérez',
                clientEmail: 'juana@example.com',
                notes: 'Llego 5 minutos tarde',
                code: 'ABC123',
            }),
        ).resolves.toMatchObject({ id: 7, notes: 'Llego 5 minutos tarde' });
        expect(book).toHaveBeenCalledWith({
            serviceId: 100,
            startsAt: '2026-09-28T12:00:00.000Z',
            clientName: 'Juana Pérez',
            clientEmail: 'juana@example.com',
            notes: 'Llego 5 minutos tarde',
            code: 'ABC123',
        });
    });

    it.each([
        ['no Comentario del Turno', undefined],
        ['an empty Comentario del Turno', ''],
    ])('leaves notes out of the body with %s', async (_case, notes) => {
        const book = jest.fn().mockResolvedValue(booking);

        await bookSlotUseCase(instrumentation, bookingsWith({ book }))({
            serviceId: 100,
            startsAt: '2026-09-28T12:00:00.000Z',
            clientName: 'Juana Pérez',
            clientEmail: 'juana@example.com',
            notes,
            code: 'ABC123',
        });
        expect(book.mock.calls[0][0]).not.toHaveProperty('notes');
    });

    it('lets a Horario reservable taken meanwhile through as SlotTakenError', async () => {
        const book = jest.fn().mockRejectedValue(new SlotTakenError('Overlaps a booked Turno for this Employee'));
        await expect(
            bookSlotUseCase(instrumentation, bookingsWith({ book }))({
                serviceId: 100,
                startsAt: '2026-09-28T12:00:00.000Z',
                clientName: 'Juana Pérez',
                clientEmail: 'juana@example.com',
                code: 'ABC123',
            }),
        ).rejects.toBeInstanceOf(SlotTakenError);
    });

    it('lets an invalid or expired Código de verificación through as InvalidVerificationCodeError', async () => {
        const book = jest.fn().mockRejectedValue(new InvalidVerificationCodeError('Invalid or expired verification code for juana@example.com'));
        await expect(
            bookSlotUseCase(instrumentation, bookingsWith({ book }))({
                serviceId: 100,
                startsAt: '2026-09-28T12:00:00.000Z',
                clientName: 'Juana Pérez',
                clientEmail: 'juana@example.com',
                code: 'WRONG1',
            }),
        ).rejects.toBeInstanceOf(InvalidVerificationCodeError);
    });
});
