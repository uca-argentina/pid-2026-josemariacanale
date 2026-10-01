import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { listMyServicesController } from '@/src/interface-adapters/controllers/services/list-my-services.controller';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const user = { id: 'user_1', name: 'Ana', email: 'ana@estudio.com' };
const signedIn = () => authWith({ getCurrentUser: jest.fn().mockResolvedValue(user) });

const service = (id: number, employeeIds: number[], hidden = false) => ({
    id,
    branchId: 10,
    slug: `s${id}`,
    name: `Servicio ${id}`,
    description: null,
    category: 'SPA',
    durationMinutes: 30,
    price: 1000,
    depositPercent: 20,
    requiresApproval: false,
    hidden,
    employees: employeeIds.map((e) => ({ id: e, name: `E${e}`, availabilityId: 99 })),
});

describe('listMyServicesController', () => {
    it('presents each group with its Sucursales, marking the Servicios the Usuario attends and the hidden ones', async () => {
        const useCase = jest.fn().mockResolvedValue([
            {
                business: { id: 1, name: 'Vitalia', slug: 'vitalia', extra: 1 },
                role: 'employee',
                employeeId: 5,
                branches: [
                    { id: 10, name: 'Centro', slug: 'centro', services: [service(1, [5, 6]), service(2, [6], true)] },
                    { id: 11, name: 'Norte', slug: 'norte', services: [] },
                ],
            },
        ]);

        await expect(listMyServicesController(instrumentation, signedIn(), useCase)()).resolves.toEqual([
            {
                business: { id: 1, name: 'Vitalia', slug: 'vitalia' },
                role: 'employee',
                employeeId: 5,
                branches: [
                    {
                        id: 10,
                        name: 'Centro',
                        slug: 'centro',
                        services: [
                            {
                                id: 1,
                                branchId: 10,
                                slug: 's1',
                                name: 'Servicio 1',
                                description: null,
                                category: 'SPA',
                                durationMinutes: 30,
                                price: 1000,
                                hidden: false,
                                offeredByMe: true,
                                employees: [
                                    { id: 5, name: 'E5' },
                                    { id: 6, name: 'E6' },
                                ],
                            },
                            expect.objectContaining({ id: 2, hidden: true, offeredByMe: false }),
                        ],
                    },
                    { id: 11, name: 'Norte', slug: 'norte', services: [] },
                ],
            },
        ]);
    });

    it('presents an empty catalog as an empty list', async () => {
        const useCase = jest.fn().mockResolvedValue([]);

        await expect(listMyServicesController(instrumentation, signedIn(), useCase)()).resolves.toEqual([]);
    });

    it('throws UnauthenticatedError when there is no Sesión, without calling the use case', async () => {
        const useCase = jest.fn();
        const auth = authWith({ getCurrentUser: jest.fn().mockRejectedValue(new UnauthenticatedError('No hay Sesión')) });

        await expect(listMyServicesController(instrumentation, auth, useCase)()).rejects.toBeInstanceOf(UnauthenticatedError);
        expect(useCase).not.toHaveBeenCalled();
    });
});
