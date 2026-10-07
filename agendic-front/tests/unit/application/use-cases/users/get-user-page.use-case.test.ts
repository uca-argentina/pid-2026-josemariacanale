import type { IUsersRepository } from '@/src/application/repositories/users.repository.interface';
import { getUserPageUseCase } from '@/src/application/use-cases/users/get-user-page.use-case';
import { NotFoundError } from '@/src/entities/errors/common';
import { instrumentation } from '@/tests/unit/stubs';

const page = { name: 'Ana', slug: 'ana', services: [{ id: 1 }] };
const usersWith = (stubs: Partial<IUsersRepository>) => stubs as IUsersRepository;

describe('getUserPageUseCase', () => {
    it('gets the page without a Servicio chosen when there is no Servicio tramo', async () => {
        const getPersonalService = jest.fn();
        const repo = usersWith({ getUserPage: jest.fn().mockResolvedValue(page), getPersonalService });

        await expect(getUserPageUseCase(instrumentation, repo)({ userSlug: 'ana' })).resolves.toEqual({ ...page, selectedService: null });
        expect(getPersonalService).not.toHaveBeenCalled();
    });

    it('gets the Servicio of the tramo, even if it is not on the page', async () => {
        const hidden = { id: 2 };
        const getPersonalService = jest.fn().mockResolvedValue(hidden);
        const repo = usersWith({ getUserPage: jest.fn().mockResolvedValue(page), getPersonalService });

        await expect(getUserPageUseCase(instrumentation, repo)({ userSlug: 'ana', serviceSlug: 'oculta' })).resolves.toEqual({
            ...page,
            selectedService: hidden,
        });
        expect(getPersonalService).toHaveBeenCalledWith('ana', 'oculta');
    });

    it('propagates the 404 of a Servicio tramo that does not exist', async () => {
        const repo = usersWith({
            getUserPage: jest.fn().mockResolvedValue(page),
            getPersonalService: jest.fn().mockRejectedValue(new NotFoundError('no')),
        });

        await expect(getUserPageUseCase(instrumentation, repo)({ userSlug: 'ana', serviceSlug: 'otra' })).rejects.toBeInstanceOf(NotFoundError);
    });
});
