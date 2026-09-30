import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { listMyEmployeesController } from '@/src/interface-adapters/controllers/employees/list-my-employees.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'ana@estudio.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const business = { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', ownerId: 7 };
const martina = { id: 4, userId: 8, name: 'Martina', email: 'martina@estudio.com' };
const ana = { id: 3, userId: 7, name: 'Ana', email: 'ana@estudio.com' };

describe('listMyEmployeesController', () => {
    it('returns the Empleados of the Dueño’s Negocio, the Dueño first and marked by userId', async () => {
        const listBusinesses = jest.fn().mockResolvedValue([business]);
        const listEmployees = jest.fn().mockResolvedValue([martina, ana]);

        await expect(listMyEmployeesController(instrumentation, signedIn(), listBusinesses, listEmployees)()).resolves.toEqual({
            businessId: 1,
            employees: [
                { id: 3, name: 'Ana', email: 'ana@estudio.com', role: 'owner' },
                { id: 4, name: 'Martina', email: 'martina@estudio.com', role: 'employee' },
            ],
        });
        expect(listEmployees).toHaveBeenCalledWith(1);
    });

    it('returns null without listing Empleados when the Usuario has no Negocio', async () => {
        const listEmployees = jest.fn();

        await expect(
            listMyEmployeesController(instrumentation, signedIn(), jest.fn().mockResolvedValue([]), listEmployees)(),
        ).resolves.toBeNull();
        expect(listEmployees).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const listBusinesses = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(listMyEmployeesController(instrumentation, auth, listBusinesses, jest.fn())()).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(listBusinesses).not.toHaveBeenCalled();
    });
});
