import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { getMyBusinessController } from '@/src/interface-adapters/controllers/businesses/get-my-business.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'a@a.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });

describe('getMyBusinessController', () => {
    it('returns the presented Negocio of the Dueño', async () => {
        const useCase = jest.fn().mockResolvedValue([{ id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', ownerId: 7 }]);

        await expect(getMyBusinessController(instrumentation, signedIn(), useCase)()).resolves.toEqual({
            id: 1,
            name: 'Estudio',
            description: 'Desc',
            slug: 'estudio',
        });
    });

    it('returns null when the Usuario has no Negocio', async () => {
        const useCase = jest.fn().mockResolvedValue([]);

        await expect(getMyBusinessController(instrumentation, signedIn(), useCase)()).resolves.toBeNull();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(getMyBusinessController(instrumentation, auth, useCase)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
