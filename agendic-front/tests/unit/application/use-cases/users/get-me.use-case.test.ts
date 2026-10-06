import type { IUsersRepository } from '@/src/application/repositories/users.repository.interface';
import { getMeUseCase } from '@/src/application/use-cases/users/get-me.use-case';
import { ApiRequestError } from '@/src/entities/errors/common';
import { instrumentation } from '@/tests/unit/stubs';

const usersWith = (stubs: Partial<IUsersRepository>) => stubs as IUsersRepository;

describe('getMeUseCase', () => {
    it('returns the Usuario with their Enlace de reserva', async () => {
        const me = { name: 'Ana', slug: null };
        const repo = usersWith({ getMe: jest.fn().mockResolvedValue(me) });

        await expect(getMeUseCase(instrumentation, repo)()).resolves.toBe(me);
    });

    it('propagates a failure of the back', async () => {
        const repo = usersWith({ getMe: jest.fn().mockRejectedValue(new ApiRequestError('boom', { status: 500 })) });

        await expect(getMeUseCase(instrumentation, repo)()).rejects.toBeInstanceOf(ApiRequestError);
    });
});
