import { updateMyPreferencesAction } from '@/app/(app)/actions';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError } from '@/src/entities/errors/common';

const mockController = jest.fn();
const mockReport = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => (key === 'IUpdateMyPreferencesController' ? mockController : { report: mockReport }),
}));
jest.mock('next/cache', () => ({ refresh: () => mockRefresh() }));
jest.mock('next/navigation', () => ({
    redirect: (path: string) => {
        throw new Error(`REDIRECT:${path}`);
    },
    unstable_rethrow: (error: Error) => {
        if (/^REDIRECT/.test(error.message)) throw error;
    },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('updateMyPreferencesAction', () => {
    it('answers the saved preferences', async () => {
        mockController.mockResolvedValue({ timeFormat: 12, weekStart: 1 });

        await expect(updateMyPreferencesAction({ timeFormat: 12 })).resolves.toEqual({ ok: true, preferences: { timeFormat: 12, weekStart: 1 } });
        expect(mockController).toHaveBeenCalledWith({ timeFormat: 12 });
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('sends an expired Sesión to Iniciar sesión', async () => {
        mockController.mockRejectedValue(new UnauthenticatedError('x'));

        await expect(updateMyPreferencesAction({})).rejects.toThrow('REDIRECT:/sign-in');
    });

    it.each([400, 500])('reports a %i with a generic message', async (status) => {
        const error = new ApiRequestError('boom', { status });
        mockController.mockRejectedValue(error);

        await expect(updateMyPreferencesAction({})).resolves.toMatchObject({ ok: false });
        expect(mockReport).toHaveBeenCalledWith(error);
    });
});
