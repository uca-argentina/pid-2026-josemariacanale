import { createOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/create-out-of-office.use-case';
import { deleteOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/delete-out-of-office.use-case';
import { updateOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/update-out-of-office.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { LeftOutsideBookingsChangedError, OutOfOfficeConflictError, OutOfOfficeRuleError } from '@/src/entities/errors/out-of-office';
import { instrumentation, outOfOfficeWith } from '@/tests/unit/stubs';

const input = { startDate: '2026-10-11', endDate: '2026-10-13', reason: 'TRAVEL' as const };

describe('createOutOfOfficeUseCase', () => {
    it('delegates to the repository', async () => {
        const createOutOfOffice = jest.fn().mockResolvedValue({ cancelledBookings: 2 });
        const body = { ...input, cancelBookingIds: [4, 5] };
        await expect(createOutOfOfficeUseCase(instrumentation, outOfOfficeWith({ createOutOfOffice }))(body)).resolves.toEqual({
            cancelledBookings: 2,
        });
        expect(createOutOfOffice).toHaveBeenCalledWith(body);
    });

    it.each([new OutOfOfficeRuleError('fin antes que inicio'), new OutOfOfficeConflictError('repetido'), new LeftOutsideBookingsChangedError('cambiaron')])(
        'lets %p through',
        async (error) => {
            const createOutOfOffice = jest.fn().mockRejectedValue(error);
            await expect(createOutOfOfficeUseCase(instrumentation, outOfOfficeWith({ createOutOfOffice }))(input)).rejects.toBe(error);
        },
    );
});

describe('updateOutOfOfficeUseCase', () => {
    it('delegates to the repository', async () => {
        const updateOutOfOffice = jest.fn().mockResolvedValue({ cancelledBookings: 1 });
        const body = { outOfOfficeId: 3, ...input, cancelBookingIds: [4] };
        await expect(updateOutOfOfficeUseCase(instrumentation, outOfOfficeWith({ updateOutOfOffice }))(body)).resolves.toEqual({
            cancelledBookings: 1,
        });
        expect(updateOutOfOffice).toHaveBeenCalledWith(body);
    });

    it.each([
        new NotFoundError('Out of office 3 not found'),
        new OutOfOfficeRuleError('x'),
        new OutOfOfficeConflictError('y'),
        new LeftOutsideBookingsChangedError('cambiaron'),
    ])(
        'lets %p through',
        async (error) => {
            const updateOutOfOffice = jest.fn().mockRejectedValue(error);
            await expect(
                updateOutOfOfficeUseCase(instrumentation, outOfOfficeWith({ updateOutOfOffice }))({ outOfOfficeId: 3, ...input }),
            ).rejects.toBe(error);
        },
    );
});

describe('deleteOutOfOfficeUseCase', () => {
    it('delegates to the repository', async () => {
        const deleteOutOfOffice = jest.fn().mockResolvedValue(undefined);
        await deleteOutOfOfficeUseCase(instrumentation, outOfOfficeWith({ deleteOutOfOffice }))(3);
        expect(deleteOutOfOffice).toHaveBeenCalledWith(3);
    });

    it('lets NotFoundError through', async () => {
        const deleteOutOfOffice = jest.fn().mockRejectedValue(new NotFoundError('Out of office 3 not found'));
        await expect(deleteOutOfOfficeUseCase(instrumentation, outOfOfficeWith({ deleteOutOfOffice }))(3)).rejects.toBeInstanceOf(NotFoundError);
    });
});
