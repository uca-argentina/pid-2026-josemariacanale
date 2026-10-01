import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { InputParseError } from '@/src/entities/errors/common';
import { getMyServiceController } from '@/src/interface-adapters/controllers/services/get-my-service.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'ana@estudio.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });
const service = {
    id: 100,
    branchId: 10,
    slug: 'masaje',
    name: 'Masaje',
    description: 'Relajante',
    category: 'SPA',
    durationMinutes: 60,
    price: 20000,
    depositPercent: 20,
    requiresApproval: true,
    hidden: false,
    prepMinutes: 15,
    dailyLimit: 6,
    employees: [
        { id: 1, name: 'Ana', availabilityId: 7 },
        { id: 2, name: 'Juan', availabilityId: 8 },
    ],
};
const branch = { id: 10, name: 'Centro', slug: 'centro', services: [service] };
const group = { business: { id: 1, name: 'Vitalia', slug: 'vitalia' }, role: 'owner', employeeId: 2, branches: [branch] };
const staff = [
    { id: 1, userId: 11, name: 'Ana', email: 'ana@estudio.com' },
    { id: 2, userId: 12, name: 'Juan', email: 'juan@estudio.com' },
    { id: 3, userId: 13, name: 'Sofía', email: 'sofia@estudio.com' },
];
const noStaff = () => jest.fn().mockRejectedValue(new Error('only the Dueño lists the Staff'));

describe('getMyServiceController', () => {
    it('finds the Servicio by the id of the path and presents it with its Negocio, its Sucursal and the Staff', async () => {
        const useCase = jest.fn().mockResolvedValue({ group, branch, service });
        const listEmployees = jest.fn().mockResolvedValue(staff);

        await expect(
            getMyServiceController(instrumentation, signedIn(), useCase, listEmployees)({ serviceId: '100' }),
        ).resolves.toEqual({
            business: { id: 1, name: 'Vitalia', slug: 'vitalia' },
            role: 'owner',
            employeeId: 2,
            branch: { id: 10, name: 'Centro', slug: 'centro' },
            service: {
                id: 100,
                branchId: 10,
                slug: 'masaje',
                name: 'Masaje',
                description: 'Relajante',
                category: 'SPA',
                durationMinutes: 60,
                price: 20000,
                depositPercent: 20,
                requiresApproval: true,
                hidden: false,
                prepMinutes: 15,
                dailyLimit: 6,
                offeredByMe: true,
                employees: [
                    { id: 1, name: 'Ana' },
                    { id: 2, name: 'Juan' },
                ],
            },
            staff: [
                { id: 1, name: 'Ana' },
                { id: 2, name: 'Juan' },
                { id: 3, name: 'Sofía' },
            ],
        });
        expect(useCase).toHaveBeenCalledWith({ serviceId: 100 });
        expect(listEmployees).toHaveBeenCalledWith(1);
    });

    it('does not list the Staff for an Empleado who is not the Dueño', async () => {
        const useCase = jest.fn().mockResolvedValue({ group: { ...group, role: 'employee' }, branch, service });
        const listEmployees = noStaff();

        const detail = await getMyServiceController(instrumentation, signedIn(), useCase, listEmployees)({ serviceId: '100' });
        expect(detail.staff).toBeNull();
        expect(listEmployees).not.toHaveBeenCalled();
    });

    it.each([
        ['an id that is not a number', { serviceId: 'masaje' }],
        ['a fractional id', { serviceId: '1.5' }],
        ['a zero id', { serviceId: '0' }],
        ['an empty id', { serviceId: '' }],
        ['no id', {}],
    ])('throws InputParseError for %s, without calling the use case', async (_case, bad) => {
        const useCase = jest.fn();

        await expect(getMyServiceController(instrumentation, signedIn(), useCase, noStaff())(bad)).rejects.toBeInstanceOf(InputParseError);
        expect(useCase).not.toHaveBeenCalled();
    });

    it('throws UnauthenticatedError when there is no Sesión, without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(getMyServiceController(instrumentation, auth, useCase, noStaff())({ serviceId: '100' })).rejects.toBeInstanceOf(
            UnauthenticatedError,
        );
        expect(useCase).not.toHaveBeenCalled();
    });
});
