import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { previewUpdateOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/preview-update-out-of-office.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const signedOut = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
const body = { outOfOfficeId: 4, startDate: '2026-10-11', endDate: '2026-10-13', reason: 'VACATION', notes: 'Playa', showNotePublicly: true };
const booking = {
    id: 9,
    startsAt: '2026-10-12T13:00:00.000Z',
    endsAt: '2026-10-12T14:00:00.000Z',
    timeZone: 'America/Argentina/Buenos_Aires',
    serviceName: 'Corte',
    clientName: 'Ana',
    business: { id: 1, name: 'Spa' },
    branch: { id: 2, name: 'Centro' },
    cancellationCause: 'OUT_OF_OFFICE' as const,
    cancellationReason: 'Estoy Fuera de la oficina',
};

describe('previewUpdateOutOfOfficeController', () => {
    it('runs the use case with the id and the body and presents the Turnos', async () => {
        const useCase = jest.fn().mockResolvedValue([{ ...booking, secret: 'x' }]);
        await expect(previewUpdateOutOfOfficeController(instrumentation, signedIn, useCase)(body)).resolves.toEqual([booking]);
        expect(useCase).toHaveBeenCalledWith(body);
    });

    it.each([
        { ...body, outOfOfficeId: undefined },
        { ...body, outOfOfficeId: 0 },
        { ...body, startDate: '11/10/2026' },
        { ...body, reason: 'HOLIDAYS' },
        {},
    ])('throws InputParseError for %j without calling the use case', async (input) => {
        const useCase = jest.fn();
        await expect(previewUpdateOutOfOfficeController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        await expect(previewUpdateOutOfOfficeController(instrumentation, signedOut, useCase)(body)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
