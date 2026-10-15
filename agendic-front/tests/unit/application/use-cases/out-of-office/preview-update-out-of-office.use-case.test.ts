import { previewUpdateOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/preview-update-out-of-office.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { OutOfOfficeConflictError, OutOfOfficeRuleError } from '@/src/entities/errors/out-of-office';
import { instrumentation, outOfOfficeWith } from '@/tests/unit/stubs';

const input = { outOfOfficeId: 3, startDate: '2026-10-11', endDate: '2026-10-13', reason: 'TRAVEL' as const };

describe('previewUpdateOutOfOfficeUseCase', () => {
    it('returns what the repository says is left outside', async () => {
        const bookings = [{ id: 1 }];
        const previewUpdateOutOfOffice = jest.fn().mockResolvedValue(bookings);
        await expect(
            previewUpdateOutOfOfficeUseCase(instrumentation, outOfOfficeWith({ previewUpdateOutOfOffice }))(input),
        ).resolves.toBe(bookings);
        expect(previewUpdateOutOfOffice).toHaveBeenCalledWith(input);
    });

    it.each([new NotFoundError('Out of office 3 not found'), new OutOfOfficeRuleError('fin antes que inicio'), new OutOfOfficeConflictError('repetido')])(
        'lets %p through',
        async (error) => {
            const previewUpdateOutOfOffice = jest.fn().mockRejectedValue(error);
            await expect(previewUpdateOutOfOfficeUseCase(instrumentation, outOfOfficeWith({ previewUpdateOutOfOffice }))(input)).rejects.toBe(error);
        },
    );
});
