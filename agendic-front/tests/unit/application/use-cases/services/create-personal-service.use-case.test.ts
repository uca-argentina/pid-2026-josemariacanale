import { createPersonalServiceUseCase } from '@/src/application/use-cases/services/create-personal-service.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { ServiceSlugTakenError } from '@/src/entities/errors/service';
import { instrumentation, servicesWith } from '@/tests/unit/stubs';

const input = {
    name: 'Clase',
    slug: 'clase',
    category: 'ACADEMIA' as const,
    durationMinutes: 45,
    price: 5000,
    availabilityId: 7,
};

describe('createPersonalServiceUseCase', () => {
    it('creates the Servicio personal and returns it', async () => {
        const created = { id: 200, slug: 'clase' };
        const repo = servicesWith({ createPersonalService: jest.fn().mockResolvedValue(created) });

        await expect(createPersonalServiceUseCase(instrumentation, repo)(input)).resolves.toBe(created);
        expect(repo.createPersonalService).toHaveBeenCalledWith(input);
    });

    it('propagates the 409 of the tramo', async () => {
        const repo = servicesWith({ createPersonalService: jest.fn().mockRejectedValue(new ServiceSlugTakenError('taken')) });

        await expect(createPersonalServiceUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(ServiceSlugTakenError);
    });

    it('propagates the 404 of an Availability that is not the Usuario’s', async () => {
        const repo = servicesWith({ createPersonalService: jest.fn().mockRejectedValue(new NotFoundError('no')) });

        await expect(createPersonalServiceUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(NotFoundError);
    });
});
