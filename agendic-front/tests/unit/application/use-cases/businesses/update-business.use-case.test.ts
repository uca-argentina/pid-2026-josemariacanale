import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import { updateBusinessUseCase } from '@/src/application/use-cases/businesses/update-business.use-case';
import { SlugTakenError } from '@/src/entities/errors/business';
import { instrumentation } from '@/tests/unit/stubs';

const input = { id: 1, name: 'Estudio', description: 'Desc', slug: 'estudio' };
const business = { ...input, ownerId: 7 };
const repoWith = (updateBusiness: jest.Mock): IBusinessesRepository => ({
    listBusinesses: jest.fn(),
    createBusiness: jest.fn(),
    updateBusiness,
});

describe('updateBusinessUseCase', () => {
    it('updates the Negocio through the repository', async () => {
        const updateBusiness = jest.fn().mockResolvedValue(business);

        await expect(updateBusinessUseCase(instrumentation, repoWith(updateBusiness))(input)).resolves.toEqual(business);
        expect(updateBusiness).toHaveBeenCalledWith(input);
    });

    it('lets SlugTakenError through', async () => {
        const repo = repoWith(jest.fn().mockRejectedValue(new SlugTakenError('x')));

        await expect(updateBusinessUseCase(instrumentation, repo)(input)).rejects.toBeInstanceOf(SlugTakenError);
    });
});
