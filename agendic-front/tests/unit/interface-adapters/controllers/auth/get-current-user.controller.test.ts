import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { getCurrentUserController } from '@/src/interface-adapters/controllers/auth/get-current-user.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const usuario = {
    id: 'user_123',
    name: 'Ana Pérez',
    email: 'ana@negocio.com',
    imageUrl: 'https://img.clerk.com/ana',
};

describe('getCurrentUserController', () => {
    it('returns the name and photo of the Usuario behind the Sesión', async () => {
        const getCurrentUser = jest.fn().mockResolvedValue(usuario);

        await expect(getCurrentUserController(instrumentation, authWith({ getCurrentUser }))()).resolves.toEqual({
            name: 'Ana Pérez',
            imageUrl: 'https://img.clerk.com/ana',
        });
    });

    // Covers no Sesión, expired and signed-out alike: the port throws UnauthenticatedError for all three.
    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const getCurrentUser = jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión'));

        await expect(
            getCurrentUserController(instrumentation, authWith({ getCurrentUser }))(),
        ).rejects.toBeInstanceOf(UnauthenticatedError);
    });
});
