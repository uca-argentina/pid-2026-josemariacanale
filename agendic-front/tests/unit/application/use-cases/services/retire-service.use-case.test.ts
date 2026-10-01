import { retireServiceUseCase } from '@/src/application/use-cases/services/retire-service.use-case';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { instrumentation, servicesWith } from '@/tests/unit/stubs';

describe('retireServiceUseCase', () => {
    it('retires the Servicio and returns how many Turnos got cancelled', async () => {
        const repo = servicesWith({ retireService: jest.fn().mockResolvedValue({ cancelledBookings: 3 }) });

        await expect(retireServiceUseCase(instrumentation, repo)({ id: 100 })).resolves.toEqual({ cancelledBookings: 3 });
        expect(repo.retireService).toHaveBeenCalledWith(100);
    });

    it('propagates the 404 of a Servicio that does not exist', async () => {
        const repo = servicesWith({ retireService: jest.fn().mockRejectedValue(new NotFoundError('gone')) });

        await expect(retireServiceUseCase(instrumentation, repo)({ id: 100 })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('propagates the 403 of a Usuario who is not the Dueño', async () => {
        const repo = servicesWith({ retireService: jest.fn().mockRejectedValue(new ApiRequestError('no', { status: 403 })) });

        await expect(retireServiceUseCase(instrumentation, repo)({ id: 100 })).rejects.toMatchObject({ status: 403 });
    });
});
