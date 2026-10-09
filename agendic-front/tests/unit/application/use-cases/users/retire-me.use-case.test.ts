import type { IUsersRepository } from '@/src/application/repositories/users.repository.interface';
import { retireMeUseCase } from '@/src/application/use-cases/users/retire-me.use-case';
import { AuthProviderDeletionError } from '@/src/entities/errors/user';
import { instrumentation } from '@/tests/unit/stubs';

const usersWith = (stubs: Partial<IUsersRepository>) => stubs as IUsersRepository;

describe('retireMeUseCase', () => {
    it('retires the Usuario through the repository', async () => {
        const retireMe = jest.fn().mockResolvedValue(undefined);

        await retireMeUseCase(instrumentation, usersWith({ retireMe }))();

        expect(retireMe).toHaveBeenCalledTimes(1);
    });

    it('lets AuthProviderDeletionError through so the Usuario can retry', async () => {
        const repo = usersWith({ retireMe: jest.fn().mockRejectedValue(new AuthProviderDeletionError('x')) });

        await expect(retireMeUseCase(instrumentation, repo)()).rejects.toBeInstanceOf(AuthProviderDeletionError);
    });
});
