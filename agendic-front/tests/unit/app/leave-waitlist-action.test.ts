import { leaveWaitlistAction } from '@/app/lista-de-espera/actions';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

const mockLeave = jest.fn();
const mockReport = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => (key === 'ILeaveWaitlistController' ? mockLeave : { report: mockReport }),
}));
jest.mock('next/navigation', () => ({ unstable_rethrow: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

describe('leaveWaitlistAction', () => {
    it('saca de la Lista de espera con el enlace', async () => {
        mockLeave.mockResolvedValue(undefined);
        await expect(leaveWaitlistAction('abc')).resolves.toEqual({ ok: true });
        expect(mockLeave).toHaveBeenCalledWith({ link: 'abc' });
    });

    it.each([
        ['un NotFoundError', new NotFoundError('Anotación not found')],
        ['un InputParseError', new InputParseError('Invalid Anotación link')],
    ])('dice que la anotación no existe ante %s, sin reportarlo', async (_case, error) => {
        mockLeave.mockRejectedValue(error);
        await expect(leaveWaitlistAction('abc')).resolves.toEqual({ ok: false, message: 'Esta anotación ya no existe.' });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('reporta un error inesperado', async () => {
        mockLeave.mockRejectedValue(new Error('boom'));
        await expect(leaveWaitlistAction('abc')).resolves.toMatchObject({ ok: false });
        expect(mockReport).toHaveBeenCalled();
    });
});
