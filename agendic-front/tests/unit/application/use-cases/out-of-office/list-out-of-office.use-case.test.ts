import { listOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/list-out-of-office.use-case';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { instrumentation, outOfOfficeWith } from '@/tests/unit/stubs';

const vacaciones = {
    id: 1,
    startDate: '2026-10-11',
    endDate: '2026-10-16',
    reason: 'VACATION' as const,
    notes: null,
    showNotePublicly: false,
};

describe('listOutOfOfficeUseCase', () => {
    it('delegates to the repository and returns what it returns', async () => {
        const listOutOfOffice = jest.fn().mockResolvedValue([vacaciones]);
        await expect(listOutOfOfficeUseCase(instrumentation, outOfOfficeWith({ listOutOfOffice }))()).resolves.toEqual([vacaciones]);
        expect(listOutOfOffice).toHaveBeenCalledWith();
    });

    it('lets UnauthenticatedError through', async () => {
        const listOutOfOffice = jest.fn().mockRejectedValue(new UnauthenticatedError('no'));
        await expect(listOutOfOfficeUseCase(instrumentation, outOfOfficeWith({ listOutOfOffice }))()).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
    });
});
