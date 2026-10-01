import { updateServiceUseCase } from '@/src/application/use-cases/services/update-service.use-case';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { ServiceSlugTakenError } from '@/src/entities/errors/service';
import { instrumentation, servicesWith } from '@/tests/unit/stubs';

const input = { id: 100, name: 'Masaje', depositPercent: null };

describe('updateServiceUseCase', () => {
    it('updates the Servicio and returns it', async () => {
        const updated = { id: 100, name: 'Masaje' };
        const repo = servicesWith({ updateService: jest.fn().mockResolvedValue(updated) });

        await expect(updateServiceUseCase(instrumentation, repo)(input)).resolves.toBe(updated);
        expect(repo.updateService).toHaveBeenCalledWith(input);
    });

    it('passes the Tiempo de preparación and the Límite diario through', async () => {
        const repo = servicesWith({ updateService: jest.fn().mockResolvedValue({ id: 100 }) });

        await updateServiceUseCase(instrumentation, repo)({ id: 100, prepMinutes: 30, dailyLimit: null });
        expect(repo.updateService).toHaveBeenCalledWith({ id: 100, prepMinutes: 30, dailyLimit: null });
    });

    it('propagates the 409 of the tramo', async () => {
        const repo = servicesWith({ updateService: jest.fn().mockRejectedValue(new ServiceSlugTakenError('taken')) });

        await expect(updateServiceUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(ServiceSlugTakenError);
    });

    it('propagates the 404 of a Servicio that does not exist', async () => {
        const repo = servicesWith({ updateService: jest.fn().mockRejectedValue(new NotFoundError('gone')) });

        await expect(updateServiceUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('propagates the 403 of a Usuario who is not the Dueño', async () => {
        const repo = servicesWith({ updateService: jest.fn().mockRejectedValue(new ApiRequestError('no', { status: 403 })) });

        await expect(updateServiceUseCase(instrumentation, repo)(input)).rejects.toMatchObject({ status: 403 });
    });
});
