import { listPersonalServicesUseCase } from '@/src/application/use-cases/services/list-personal-services.use-case';
import { ApiRequestError } from '@/src/entities/errors/common';
import { instrumentation, servicesWith } from '@/tests/unit/stubs';

describe('listPersonalServicesUseCase', () => {
    it('returns the Servicios personales as they come', async () => {
        const services = [{ id: 200 }];
        const repo = servicesWith({ listPersonalServices: jest.fn().mockResolvedValue(services) });

        await expect(listPersonalServicesUseCase(instrumentation, repo)()).resolves.toBe(services);
    });

    it('propagates a failure of the back', async () => {
        const repo = servicesWith({ listPersonalServices: jest.fn().mockRejectedValue(new ApiRequestError('boom', { status: 500 })) });

        await expect(listPersonalServicesUseCase(instrumentation, repo)()).rejects.toBeInstanceOf(ApiRequestError);
    });
});
