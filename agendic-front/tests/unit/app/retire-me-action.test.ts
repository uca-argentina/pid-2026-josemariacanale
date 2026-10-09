import { retireMeAction } from '@/app/(app)/actions';
import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError } from '@/src/entities/errors/common';
import { AuthProviderDeletionError } from '@/src/entities/errors/user';

const mockController = jest.fn();
const mockReport = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => (key === 'IRetireMeController' ? mockController : { report: mockReport }),
}));
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
    mockController.mockResolvedValue(undefined);
});

describe('retireMeAction', () => {
    it('answers ok when the back retires the Usuario', async () => {
        await expect(retireMeAction()).resolves.toEqual({ ok: true });
    });

    it('shows the message of the 502 so the Usuario can retry', async () => {
        const message = 'No se pudo borrar el Usuario en el Proveedor de autenticación';
        mockController.mockRejectedValue(new AuthProviderDeletionError(message));

        await expect(retireMeAction()).resolves.toEqual({ ok: false, message });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('flags a Usuario that was already dado de baja so the client closes the Sesión', async () => {
        mockController.mockRejectedValue(new ApiRequestError('User 7 is dado de baja', { status: 403 }));

        await expect(retireMeAction()).resolves.toMatchObject({ ok: false, deactivated: true });
    });

    it('sends an expired Sesión to Iniciar sesión', async () => {
        mockController.mockRejectedValue(new UnauthenticatedError('x'));

        await expect(retireMeAction()).rejects.toThrow('REDIRECT:/sign-in');
    });

    it('reports an unexpected failure with a generic message', async () => {
        const error = new ApiRequestError('boom', { status: 500 });
        mockController.mockRejectedValue(error);

        await expect(retireMeAction()).resolves.toMatchObject({ ok: false });
        expect(mockReport).toHaveBeenCalledWith(error);
    });
});
