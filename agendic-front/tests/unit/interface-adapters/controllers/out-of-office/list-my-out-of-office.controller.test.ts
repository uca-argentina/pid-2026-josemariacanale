import { listMyOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/list-my-out-of-office.controller';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = authWith({ getCurrentUser: jest.fn().mockResolvedValue({}) });
const viaje = {
    id: 2,
    startDate: '2026-11-01',
    endDate: '2026-11-03',
    reason: 'TRAVEL' as const,
    notes: 'Congreso',
    showNotePublicly: true,
};

describe('listMyOutOfOfficeController', () => {
    it('returns the Usuario’s períodos', async () => {
        const list = jest.fn().mockResolvedValue([viaje]);

        await expect(listMyOutOfOfficeController(instrumentation, signedIn, list)()).resolves.toEqual([viaje]);
    });

    it('whitelists the fields of each período', async () => {
        const list = jest.fn().mockResolvedValue([{ ...viaje, userId: 9 }]);

        await expect(listMyOutOfOfficeController(instrumentation, signedIn, list)()).resolves.toEqual([viaje]);
    });

    it('throws UnauthenticatedError without listing', async () => {
        const list = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('no')) });

        await expect(listMyOutOfOfficeController(instrumentation, auth, list)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(list).not.toHaveBeenCalled();
    });
});
