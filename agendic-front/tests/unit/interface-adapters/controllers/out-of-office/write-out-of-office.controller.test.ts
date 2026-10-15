import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { createOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/create-out-of-office.controller';
import { deleteOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/delete-out-of-office.controller';
import { updateOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/update-out-of-office.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const signedOut = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });
const body = { startDate: '2026-10-11', endDate: '2026-10-13', reason: 'VACATION', notes: 'Playa', showNotePublicly: true };
const invalidBodies = [
    { ...body, startDate: '11/10/2026' },
    { ...body, endDate: undefined },
    { ...body, reason: 'HOLIDAYS' },
    { ...body, showNotePublicly: 'sí' },
    {},
];

describe('createOutOfOfficeController', () => {
    it('runs the use case with the body', async () => {
        const useCase = jest.fn().mockResolvedValue({ cancelledBookings: 1 });
        const confirmed = { ...body, cancelBookingIds: [4, 5] };
        await expect(createOutOfOfficeController(instrumentation, signedIn, useCase)(confirmed)).resolves.toEqual({ cancelledBookings: 1 });
        expect(useCase).toHaveBeenCalledWith(confirmed);
    });

    it('accepts a body without notes', async () => {
        const useCase = jest.fn().mockResolvedValue({ cancelledBookings: 0 });
        const minimal = { startDate: body.startDate, endDate: body.endDate, reason: body.reason };
        await createOutOfOfficeController(instrumentation, signedIn, useCase)(minimal);
        expect(useCase).toHaveBeenCalledWith(minimal);
    });

    it.each([...invalidBodies, { ...body, cancelBookingIds: [0] }, { ...body, cancelBookingIds: ['a'] }, { ...body, cancelBookingIds: 3 }])(
        'throws InputParseError for %j without calling the use case',
        async (input) => {
            const useCase = jest.fn();
            await expect(createOutOfOfficeController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
            expect(useCase).not.toHaveBeenCalled();
        },
    );

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        await expect(createOutOfOfficeController(instrumentation, signedOut, useCase)(body)).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});

describe('updateOutOfOfficeController', () => {
    it('runs the use case with the id and the body', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await updateOutOfOfficeController(instrumentation, signedIn, useCase)({ outOfOfficeId: 4, ...body });
        expect(useCase).toHaveBeenCalledWith({ outOfOfficeId: 4, ...body });
    });

    it.each([...invalidBodies.map((invalid) => ({ outOfOfficeId: 4, ...invalid })), { ...body }, { outOfOfficeId: 0, ...body }])(
        'throws InputParseError for %j without calling the use case',
        async (input) => {
            const useCase = jest.fn();
            await expect(updateOutOfOfficeController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
            expect(useCase).not.toHaveBeenCalled();
        },
    );

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        await expect(updateOutOfOfficeController(instrumentation, signedOut, useCase)({ outOfOfficeId: 4, ...body })).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });
});

describe('deleteOutOfOfficeController', () => {
    it('runs the use case with the id', async () => {
        const useCase = jest.fn().mockResolvedValue(undefined);
        await deleteOutOfOfficeController(instrumentation, signedIn, useCase)({ outOfOfficeId: 4 });
        expect(useCase).toHaveBeenCalledWith(4);
    });

    it.each([{}, { outOfOfficeId: 0 }, { outOfOfficeId: '4' }, { outOfOfficeId: 1.5 }])(
        'throws InputParseError for %j without calling the use case',
        async (input) => {
            const useCase = jest.fn();
            await expect(deleteOutOfOfficeController(instrumentation, signedIn, useCase)(input)).rejects.toBeInstanceOf(InputParseError);
            expect(useCase).not.toHaveBeenCalled();
        },
    );

    it('throws UnauthenticatedError without calling the use case', async () => {
        const useCase = jest.fn();
        await expect(deleteOutOfOfficeController(instrumentation, signedOut, useCase)({ outOfOfficeId: 4 })).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });
});
