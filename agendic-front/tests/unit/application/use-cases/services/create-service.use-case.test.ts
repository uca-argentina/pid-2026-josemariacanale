import { createServiceUseCase } from '@/src/application/use-cases/services/create-service.use-case';
import { ApiRequestError } from '@/src/entities/errors/common';
import { ServiceSlugTakenError } from '@/src/entities/errors/service';
import { instrumentation, servicesWith } from '@/tests/unit/stubs';

const input = {
    branchId: 10,
    name: 'Masaje',
    slug: 'masaje',
    category: 'SPA' as const,
    durationMinutes: 60,
    price: 20000,
    employeeIds: [1],
};

describe('createServiceUseCase', () => {
    it('creates the Servicio and returns it', async () => {
        const created = { id: 100, slug: 'masaje' };
        const repo = servicesWith({ createService: jest.fn().mockResolvedValue(created) });

        await expect(createServiceUseCase(instrumentation, repo)(input)).resolves.toBe(created);
        expect(repo.createService).toHaveBeenCalledWith(input);
    });

    it('propagates the 409 of the tramo', async () => {
        const repo = servicesWith({ createService: jest.fn().mockRejectedValue(new ServiceSlugTakenError('taken')) });

        await expect(createServiceUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(ServiceSlugTakenError);
    });

    it('propagates the 403 of a Usuario who is not the Dueño', async () => {
        const repo = servicesWith({ createService: jest.fn().mockRejectedValue(new ApiRequestError('no', { status: 403 })) });

        await expect(createServiceUseCase(instrumentation, repo)(input)).rejects.toMatchObject({ status: 403 });
    });
});
