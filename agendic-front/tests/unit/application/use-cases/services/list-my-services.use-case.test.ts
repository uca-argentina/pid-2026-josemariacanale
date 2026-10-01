import { listMyServicesUseCase } from '@/src/application/use-cases/services/list-my-services.use-case';
import { ApiRequestError } from '@/src/entities/errors/common';
import { instrumentation, servicesWith } from '@/tests/unit/stubs';

describe('listMyServicesUseCase', () => {
    it('returns the catalog of the Usuario', async () => {
        const catalog = [
            { business: { id: 1, name: 'Vitalia', slug: 'vitalia' }, role: 'owner' as const, employeeId: 1, branches: [] },
        ];
        const repo = servicesWith({ listMyCatalog: jest.fn().mockResolvedValue(catalog) });

        await expect(listMyServicesUseCase(instrumentation, repo)()).resolves.toEqual(catalog);
    });

    it('propagates a failure of the back', async () => {
        const repo = servicesWith({ listMyCatalog: jest.fn().mockRejectedValue(new ApiRequestError('boom', { status: 500 })) });

        await expect(listMyServicesUseCase(instrumentation, repo)()).rejects.toBeInstanceOf(ApiRequestError);
    });
});
