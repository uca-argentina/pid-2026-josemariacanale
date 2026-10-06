import { getMyServiceUseCase } from '@/src/application/use-cases/services/get-my-service.use-case';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { instrumentation, servicesWith } from '@/tests/unit/stubs';

const service = { id: 100, branchId: 10, name: 'Masaje' };
const branch = { id: 10, name: 'Centro', slug: 'centro', services: [service] };
const group = {
    business: { id: 1, name: 'Vitalia', slug: 'vitalia' },
    role: 'owner' as const,
    employeeId: 1,
    branches: [{ id: 9, name: 'Norte', slug: 'norte', services: [] }, branch],
};

describe('getMyServiceUseCase', () => {
    it('finds the Servicio in the catalog, with its Negocio and its Sucursal', async () => {
        const repo = servicesWith({ listMyCatalog: jest.fn().mockResolvedValue([group]), listPersonalServices: jest.fn().mockResolvedValue([]) });

        await expect(getMyServiceUseCase(instrumentation, repo)({ serviceId: 100 })).resolves.toEqual({
            group,
            branch,
            service,
        });
    });

    it('finds a Servicio personal when it is not in the catalog, without Negocio or Sucursal', async () => {
        const personal = { id: 200, name: 'Clase', availabilityId: 7 };
        const repo = servicesWith({
            listMyCatalog: jest.fn().mockResolvedValue([group]),
            listPersonalServices: jest.fn().mockResolvedValue([personal]),
        });

        await expect(getMyServiceUseCase(instrumentation, repo)({ serviceId: 200 })).resolves.toEqual({
            group: null,
            branch: null,
            service: personal,
        });
    });

    it('throws NotFoundError when the Servicio is neither in the catalog nor personal', async () => {
        const repo = servicesWith({ listMyCatalog: jest.fn().mockResolvedValue([group]), listPersonalServices: jest.fn().mockResolvedValue([]) });

        await expect(getMyServiceUseCase(instrumentation, repo)({ serviceId: 999 })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws NotFoundError when the Usuario has no Servicios', async () => {
        const repo = servicesWith({ listMyCatalog: jest.fn().mockResolvedValue([]), listPersonalServices: jest.fn().mockResolvedValue([]) });

        await expect(getMyServiceUseCase(instrumentation, repo)({ serviceId: 100 })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('propagates a failure of the back', async () => {
        const repo = servicesWith({
            listMyCatalog: jest.fn().mockRejectedValue(new ApiRequestError('boom', { status: 500 })),
            listPersonalServices: jest.fn().mockResolvedValue([]),
        });

        await expect(getMyServiceUseCase(instrumentation, repo)({ serviceId: 100 })).rejects.toBeInstanceOf(ApiRequestError);
    });
});
