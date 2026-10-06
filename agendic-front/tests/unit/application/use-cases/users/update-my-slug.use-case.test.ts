import type { IUsersRepository } from '@/src/application/repositories/users.repository.interface';
import { updateMySlugUseCase } from '@/src/application/use-cases/users/update-my-slug.use-case';
import { SlugTakenError } from '@/src/entities/errors/business';
import { instrumentation } from '@/tests/unit/stubs';

const usersWith = (stubs: Partial<IUsersRepository>) => stubs as IUsersRepository;

describe('updateMySlugUseCase', () => {
    it('changes the Enlace de reserva and returns the Usuario', async () => {
        const me = { name: 'Ana', slug: 'ana' };
        const updateMySlug = jest.fn().mockResolvedValue(me);

        await expect(updateMySlugUseCase(instrumentation, usersWith({ updateMySlug }))({ slug: 'ana' })).resolves.toBe(me);
        expect(updateMySlug).toHaveBeenCalledWith('ana');
    });

    it('propagates the 409 of an Enlace de reserva in use', async () => {
        const repo = usersWith({ updateMySlug: jest.fn().mockRejectedValue(new SlugTakenError('taken')) });

        await expect(updateMySlugUseCase(instrumentation, repo)({ slug: 'ana' })).rejects.toBeInstanceOf(SlugTakenError);
    });
});
