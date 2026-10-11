import type { IUsersRepository } from '@/src/application/repositories/users.repository.interface';
import { updateMyPreferencesUseCase } from '@/src/application/use-cases/users/update-my-preferences.use-case';
import { ApiRequestError } from '@/src/entities/errors/common';
import { instrumentation } from '@/tests/unit/stubs';

const usersWith = (stubs: Partial<IUsersRepository>) => stubs as IUsersRepository;

describe('updateMyPreferencesUseCase', () => {
    it('saves only what it is given through the repository', async () => {
        const me = { name: 'Ana', slug: null, imageUrl: null, timeFormat: 12, weekStart: 1 };
        const updateMyPreferences = jest.fn().mockResolvedValue(me);

        await expect(updateMyPreferencesUseCase(instrumentation, usersWith({ updateMyPreferences }))({ timeFormat: 12 })).resolves.toEqual(me);
        expect(updateMyPreferences).toHaveBeenCalledWith({ timeFormat: 12 });
    });

    it('lets ApiRequestError through', async () => {
        const repo = usersWith({ updateMyPreferences: jest.fn().mockRejectedValue(new ApiRequestError('x', { status: 400 })) });

        await expect(updateMyPreferencesUseCase(instrumentation, repo)({ weekStart: 0 })).rejects.toBeInstanceOf(ApiRequestError);
    });
});
