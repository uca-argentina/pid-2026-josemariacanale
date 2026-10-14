import { previewOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/preview-out-of-office.use-case';
import { OutOfOfficeConflictError, OutOfOfficeRuleError } from '@/src/entities/errors/out-of-office';
import { instrumentation, outOfOfficeWith } from '@/tests/unit/stubs';

const input = { startDate: '2026-10-11', endDate: '2026-10-13', reason: 'TRAVEL' as const };

describe('previewOutOfOfficeUseCase', () => {
    it('returns what the repository says is left outside', async () => {
        const bookings = [{ id: 1 }];
        const previewOutOfOffice = jest.fn().mockResolvedValue(bookings);
        await expect(previewOutOfOfficeUseCase(instrumentation, outOfOfficeWith({ previewOutOfOffice }))(input)).resolves.toBe(bookings);
        expect(previewOutOfOffice).toHaveBeenCalledWith(input);
    });

    it.each([new OutOfOfficeRuleError('fin antes que inicio'), new OutOfOfficeConflictError('repetido')])('lets %p through', async (error) => {
        const previewOutOfOffice = jest.fn().mockRejectedValue(error);
        await expect(previewOutOfOfficeUseCase(instrumentation, outOfOfficeWith({ previewOutOfOffice }))(input)).rejects.toBe(error);
    });
});
