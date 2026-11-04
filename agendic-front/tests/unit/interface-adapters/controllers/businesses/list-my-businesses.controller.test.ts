import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { listMyBusinessesController } from '@/src/interface-adapters/controllers/businesses/list-my-businesses.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue({ id: 'user_1', name: 'Ana', email: 'ana@estudio.com' }) });
const owned = { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', logoUrl: null, role: 'owner' as const, branchIds: [3, 4] };
const worked = { id: 2, name: 'Spa', description: 'Desc', slug: 'spa', logoUrl: null, role: 'employee' as const, branchIds: [5] };
const branch = (id: number) => ({ id, businessId: 2, name: `Sucursal ${id}`, address: `Calle ${id}`, timeZone: 'America/Argentina/Buenos_Aires', slug: `s${id}` });

describe('listMyBusinessesController', () => {
    it('returns the Negocios with their role, and only the Sucursales where the Empleado works', async () => {
        const listMyBusinesses = jest.fn().mockResolvedValue([worked]);
        const listBranches = jest.fn().mockResolvedValue([branch(5), branch(6)]);

        await expect(listMyBusinessesController(instrumentation, signedIn(), listMyBusinesses, listBranches)()).resolves.toEqual([
            { ...worked, branches: [{ id: 5, name: 'Sucursal 5', address: 'Calle 5' }] },
        ]);
        expect(listBranches).toHaveBeenCalledWith(2);
    });

    it('does not ask for the Sucursales of a Negocio of the Dueño', async () => {
        const listBranches = jest.fn();

        await expect(
            listMyBusinessesController(instrumentation, signedIn(), jest.fn().mockResolvedValue([owned]), listBranches)(),
        ).resolves.toEqual([{ ...owned, branches: [] }]);
        expect(listBranches).not.toHaveBeenCalled();
    });

    it('returns an empty list when the Usuario is Empleado of no Negocio', async () => {
        await expect(
            listMyBusinessesController(instrumentation, signedIn(), jest.fn().mockResolvedValue([]), jest.fn())(),
        ).resolves.toEqual([]);
    });

    it('does not leak fields the page does not need', async () => {
        const listMyBusinesses = jest.fn().mockResolvedValue([{ ...owned, ownerId: 7 }]);

        await expect(listMyBusinessesController(instrumentation, signedIn(), listMyBusinesses, jest.fn())()).resolves.toEqual([
            { ...owned, branches: [] },
        ]);
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const listMyBusinesses = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(listMyBusinessesController(instrumentation, auth, listMyBusinesses, jest.fn())()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(listMyBusinesses).not.toHaveBeenCalled();
    });
});
