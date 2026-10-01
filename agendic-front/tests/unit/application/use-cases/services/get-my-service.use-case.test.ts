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
        const repo = servicesWith({ listMyCatalog: jest.fn().mockResolvedValue([group]) });

        await expect(getMyServiceUseCase(instrumentation, repo)({ serviceId: 100 })).resolves.toEqual({
            group,
            branch,
            service,
        });
    });

    it('throws NotFoundError when the Servicio is not in the catalog', async () => {
        const repo = servicesWith({ listMyCatalog: jest.fn().mockResolvedValue([group]) });

        await expect(getMyServiceUseCase(instrumentation, repo)({ serviceId: 999 })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws NotFoundError when the catalog is empty', async () => {
        const repo = servicesWith({ listMyCatalog: jest.fn().mockResolvedValue([]) });

        await expect(getMyServiceUseCase(instrumentation, repo)({ serviceId: 100 })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('propagates a failure of the back', async () => {
        const repo = servicesWith({ listMyCatalog: jest.fn().mockRejectedValue(new ApiRequestError('boom', { status: 500 })) });

        await expect(getMyServiceUseCase(instrumentation, repo)({ serviceId: 100 })).rejects.toBeInstanceOf(ApiRequestError);
    });
});
