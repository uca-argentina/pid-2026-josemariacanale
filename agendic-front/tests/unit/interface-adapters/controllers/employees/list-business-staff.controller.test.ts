import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { listBusinessStaffController } from '@/src/interface-adapters/controllers/employees/list-business-staff.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'ana@estudio.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const business = { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio', logoUrl: null, branchIds: [] };
const martina = { id: 4, name: 'Martina', email: 'martina@estudio.com' };
const ana = { id: 3, name: 'Ana', email: 'Ana@Estudio.com' };
const invitation = { id: 5, email: 'nuevo@estudio.com', expiresAt: 'x' };

describe('listBusinessStaffController', () => {
    it('returns the Staff of a Negocio of the Dueño, the Dueño first, with the pending Invitaciones', async () => {
        const listMy = jest.fn().mockResolvedValue([{ ...business, role: 'owner' }]);
        const listEmployees = jest.fn().mockResolvedValue([martina, ana]);
        const listInvitations = jest.fn().mockResolvedValue([invitation]);

        await expect(
            listBusinessStaffController(instrumentation, signedIn(), listMy, listEmployees, listInvitations)({ businessId: 1 }),
        ).resolves.toEqual({
            businessId: 1,
            viewerIsOwner: true,
            employees: [
                { id: 3, name: 'Ana', email: 'Ana@Estudio.com', role: 'owner' },
                { id: 4, name: 'Martina', email: 'martina@estudio.com', role: 'employee' },
            ],
            invitations: [{ id: 5, email: 'nuevo@estudio.com', expiresAt: 'x' }],
        });
        expect(listEmployees).toHaveBeenCalledWith(1);
    });

    it('does not ask for Invitaciones when the Usuario is only an Empleado of the Negocio', async () => {
        const listMy = jest.fn().mockResolvedValue([{ ...business, role: 'employee' }]);
        const listInvitations = jest.fn();

        const result = await listBusinessStaffController(instrumentation, signedIn(), listMy, jest.fn().mockResolvedValue([martina, ana]), listInvitations)({
            businessId: 1,
        });

        expect(result).toMatchObject({ viewerIsOwner: false, invitations: [] });
        expect(listInvitations).not.toHaveBeenCalled();
    });

    it('returns null without listing Empleados when the Usuario is not Empleado of that Negocio', async () => {
        const listEmployees = jest.fn();
        const listMy = jest.fn().mockResolvedValue([{ ...business, id: 2, role: 'owner' }]);

        await expect(
            listBusinessStaffController(instrumentation, signedIn(), listMy, listEmployees, jest.fn())({ businessId: 1 }),
        ).resolves.toBeNull();
        expect(listEmployees).not.toHaveBeenCalled();
    });

    it('throws InputParseError when businessId is not a number', async () => {
        const listMy = jest.fn();

        await expect(
            listBusinessStaffController(instrumentation, signedIn(), listMy, jest.fn(), jest.fn())({ businessId: 'x' }),
        ).rejects.toBeInstanceOf(InputParseError);
        expect(listMy).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión', async () => {
        const listMy = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(listBusinessStaffController(instrumentation, auth, listMy, jest.fn(), jest.fn())({ businessId: 1 })).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(listMy).not.toHaveBeenCalled();
    });
});
