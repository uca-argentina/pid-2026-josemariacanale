import { SlotTakenError } from '@/src/entities/errors/booking';
import { InputParseError } from '@/src/entities/errors/common';
import { bookSlotController } from '@/src/interface-adapters/controllers/bookings/book-slot.controller';
import { instrumentation } from '@/tests/unit/stubs';

const input = {
    serviceId: 100,
    startsAt: '2026-09-28T12:00:00.000Z',
    clientName: '  Juana Pérez ',
    clientEmail: ' juana@example.com ',
    notes: '  Llego 5 minutos tarde ',
    code: ' ABC123 ',
};

const booking = {
    id: 7,
    serviceId: 100,
    employeeId: 1,
    employeeName: 'Ana',
    startsAt: '2026-09-28T12:00:00.000Z',
    endsAt: '2026-09-28T13:00:00.000Z',
    status: 'BOOKED',
    notes: 'Llego 5 minutos tarde',
};

describe('bookSlotController', () => {
    it('books with the trimmed data of the Cliente y su Código de verificación, y presenta el Turno con su estado real', async () => {
        const useCase = jest.fn().mockResolvedValue({ ...booking, status: 'PENDING' });

        await expect(bookSlotController(instrumentation, useCase)(input)).resolves.toEqual({
            id: 7,
            startsAt: '2026-09-28T12:00:00.000Z',
            endsAt: '2026-09-28T13:00:00.000Z',
            status: 'PENDING',
            notes: 'Llego 5 minutos tarde',
            employeeName: 'Ana',
            link: null,
        });
        expect(useCase).toHaveBeenCalledWith({
            serviceId: 100,
            startsAt: '2026-09-28T12:00:00.000Z',
            clientName: 'Juana Pérez',
            clientEmail: 'juana@example.com',
            notes: 'Llego 5 minutos tarde',
            code: 'ABC123',
        });
    });

    it('presenta el Enlace del Turno recién creado (ADR 0022)', async () => {
        const useCase = jest.fn().mockResolvedValue({ ...booking, link: 's3cr3t-l1nk' });
        await expect(bookSlotController(instrumentation, useCase)(input)).resolves.toMatchObject({ link: 's3cr3t-l1nk' });
    });

    it('presenta un Turno que el back devuelve sin notes como uno sin Comentario', async () => {
        const withoutNotes = { ...booking, notes: undefined };
        const useCase = jest.fn().mockResolvedValue(withoutNotes);
        await expect(bookSlotController(instrumentation, useCase)({ ...input, notes: undefined })).resolves.toMatchObject({
            notes: null,
        });
    });

    it.each([
        ['a missing serviceId', { ...input, serviceId: undefined }],
        ['a startsAt that is not an ISO instant', { ...input, startsAt: 'mañana a las 9' }],
        ['a blank clientName', { ...input, clientName: '   ' }],
        ['an invalid clientEmail', { ...input, clientEmail: 'juana' }],
        ['a Comentario del Turno over 500 characters', { ...input, notes: 'a'.repeat(501) }],
        ['a missing code', { ...input, code: undefined }],
        ['a blank code', { ...input, code: '   ' }],
    ])('throws InputParseError with %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();
        await expect(bookSlotController(instrumentation, useCase)(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    // The framework layer tells it apart by class so it does not report it: it is expected.
    it('lets a Horario reservable taken meanwhile through as SlotTakenError', async () => {
        const taken = new SlotTakenError('Overlaps a booked Turno for this Employee');
        const useCase = jest.fn().mockRejectedValue(taken);
        await expect(bookSlotController(instrumentation, useCase)(input)).rejects.toBe(taken);
    });
});
