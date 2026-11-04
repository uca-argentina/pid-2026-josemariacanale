import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { listMyBusinessesController } from '@/src/interface-adapters/controllers/businesses/list-my-businesses.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'user_1', name: 'Ana', email: 'ana@estudio.com' }) });
const business = { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', logoUrl: null, role: 'owner' as const, branchIds: [3, 4] };

describe('listMyBusinessesController', () => {
    it('returns the Negocios with their role and the Sucursales where the Usuario works', async () => {
        const listMyBusinesses = jest.fn().mockResolvedValue([business]);

        await expect(listMyBusinessesController(instrumentation, signedIn(), listMyBusinesses)()).resolves.toEqual([business]);
    });

    it('returns an empty list when the Usuario is Empleado of no Negocio', async () => {
        await expect(listMyBusinessesController(instrumentation, signedIn(), jest.fn().mockResolvedValue([]))()).resolves.toEqual([]);
    });

    it('does not leak fields the page does not need', async () => {
        const listMyBusinesses = jest.fn().mockResolvedValue([{ ...business, ownerId: 7 }]);

        await expect(listMyBusinessesController(instrumentation, signedIn(), listMyBusinesses)()).resolves.toEqual([business]);
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const listMyBusinesses = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(listMyBusinessesController(instrumentation, auth, listMyBusinesses)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(listMyBusinesses).not.toHaveBeenCalled();
    });
});
